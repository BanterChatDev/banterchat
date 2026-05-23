import asyncio
import inspect
import logging

from .commands import Command, CommandRegistry, Context, CommandError, CommandNotFound
from .gateway import Gateway
from .http import HTTPClient
from .intents import Intents
from .logger import Logger
from .models import User, Guild, Channel, Member, Message
from .errors import GatewayError, LoginFailure, DuplicateCommand

log = Logger(__name__)


_DEFAULT_BASE_URL = "https://banterchat.org"
_GATEWAY_PATH = "/api/v1/bot/gateway"

class Bot:

    def __init__(
        self,
        intents=None,
        *,
        base_url=_DEFAULT_BASE_URL,
        ws_url=None,
        reconnect=True,
        command_prefix="!",
        application_id="",
        help_enabled=True,
        help_color=0x5865f2,
        debug=False,
    ):
        self._debug = bool(debug)
        self.intents = intents if intents is not None else Intents.default()
        self.base_url = base_url.rstrip("/")
        self.ws_url = ws_url or (
            self.base_url
            .replace("http://", "ws://")
            .replace("https://", "wss://")
            + _GATEWAY_PATH
        )
        self.reconnect = reconnect
        self.command_prefix = command_prefix
        self.application_id = application_id
        self.help_enabled = help_enabled
        self.help_color = help_color
        self.user = None
        self.guilds = {}
        self._http = None
        self._gateway = None
        self._handlers = {}
        self._commands = CommandRegistry()
        self._slash_commands = []
        self._slash_handlers = {}
        self._button_handlers_exact = {}
        self._button_handlers_prefix = []
        self._loop = None
        self.session_id = ""
        if self.help_enabled:
            self._register_default_help()

    def event(self, fn):
        name = fn.__name__
        if not name.startswith("on_"):
            raise ValueError("event handlers must be named on_<event>")
        self._handlers[name] = fn
        return fn

    def command(self, name=None, aliases=None, help=None, category=None):
        def decorator(fn):
            cmd = Command(fn, name=name, aliases=aliases, help=help, category=category)
            self._commands.add(cmd)
            return fn
        return decorator

    def slash_command(self, name=None, description="", options=None, category=None):
        def decorator(fn):
            cmd_name = name or fn.__name__
            if cmd_name in self._slash_handlers:
                log.panic("duplicate slash command %r — fix your command loader and restart", cmd_name)
            entry = {
                "name": cmd_name,
                "description": description or cmd_name,
            }
            if options:
                from .commands import SlashOption as _SO
                entry["options"] = [
                    (o.to_dict() if isinstance(o, _SO) else dict(o))
                    for o in options
                ]
            if category is not None:
                entry["_category"] = category
            self._slash_commands.append(entry)
            self._slash_handlers[cmd_name] = fn
            return fn
        return decorator

    def on_button(self, custom_id):
        if not custom_id:
            raise ValueError("custom_id must be a non-empty string")
        def decorator(fn):
            if custom_id.endswith("*"):
                self._button_handlers_prefix.append((custom_id[:-1], fn))
            else:
                self._button_handlers_exact[custom_id] = fn
            return fn
        return decorator

    def _pick_button_handler(self, custom_id):
        if not custom_id:
            return None
        exact = self._button_handlers_exact.get(custom_id)
        if exact is not None:
            return exact
        for prefix, fn in self._button_handlers_prefix:
            if custom_id.startswith(prefix):
                return fn
        return None

    def _register_default_help(self):
        from . import helpcommand
        helpcommand.register(self)

    async def sync_commands(self):
        if not self._slash_commands:
            return 0
        wire = [{k: v for k, v in entry.items() if not k.startswith("_")} for entry in self._slash_commands]
        result = await self._http.register_commands(wire)
        return result.get("registered", len(self._slash_commands)) if result else 0

    @property
    def commands(self):
        return self._commands.all()

    async def process_commands(self, message):
        if self.user is not None and message.user_id == self.user.id:
            return
        content = message.content or ""
        if not content.startswith(self.command_prefix):
            return
        stripped = content[len(self.command_prefix):]
        if not stripped:
            return
        parts = stripped.split(maxsplit=1)
        name = parts[0]
        args_raw = parts[1] if len(parts) > 1 else ""
        cmd = self._commands.get(name)
        if cmd is None:
            return
        ctx = Context(self, message, name, args_raw)
        try:
            await cmd.invoke(ctx)
        except CommandError as e:
            await self._fire("on_command_error", ctx, e)
        except Exception as e:
            await self._fire("on_command_error", ctx, e)

    async def _dispatch(self, event_type, payload):
        if event_type == "ready":
            user_data = payload.get("user", {})
            self.user = User.from_dict(user_data)
            for g in payload.get("guilds", []) or []:
                guild = Guild.from_dict(g)
                self.guilds[guild.id] = guild
            app_id_from_ready = payload.get("application_id", "")
            if app_id_from_ready and not self.application_id:
                self.application_id = app_id_from_ready
            self.session_id = payload.get("session_id", "")
            log.info("gateway connected session_id=%s user=%s (%s)", self.session_id, self.user.username, self.user.id)
            if self._slash_commands:
                try:
                    await self.sync_commands()
                except DuplicateCommand as e:
                    log.info(
                        "command sync rejected by server: duplicate name %r in "
                        "registration payload. The server did NOT modify your "
                        "previously-registered commands. Check your command "
                        "loader for a duplicate entry, or rename one of the "
                        "commands.",
                        e.name,
                    )
                except Exception as e:
                    log.info("command sync failed: %s", e)
            await self._fire("on_ready")
            return

        if event_type == "resumed":
            log.info("gateway resumed session_id=%s last_seq=%s", self.session_id, self._gateway.last_seq)
            await self._fire("on_resumed")
            return

        if event_type in ("channel_message", "message_create"):
            msg = Message.from_dict(payload, client=self)
            await self._fire("on_message", msg)
            await self.process_commands(msg)
            return

        if event_type == "message_edit":
            await self._fire("on_message_edit", payload)
            return

        if event_type == "message_delete":
            await self._fire("on_message_delete", payload)
            return

        if event_type == "reaction_add":
            await self._fire("on_reaction_add", payload)
            return

        if event_type == "reaction_remove":
            await self._fire("on_reaction_remove", payload)
            return

        if event_type == "guild_member_add":
            await self._fire("on_member_join", payload)
            return

        if event_type == "guild_member_remove":
            await self._fire("on_member_remove", payload)
            return

        if event_type == "error":
            await self._fire("on_error", payload)
            return

        if event_type == "interaction_create":
            from .interactions import Interaction
            interaction = Interaction(payload, client=self)
            if interaction.is_button:
                handler = self._pick_button_handler(interaction.custom_id)
                if handler is not None:
                    log.info(
                        "button clicked: custom_id=%s by %s",
                        interaction.custom_id, interaction.user_id,
                    )
                    try:
                        result = handler(interaction)
                        if inspect.isawaitable(result):
                            await result
                    except Exception:
                        log.info("button handler for %r raised", interaction.custom_id, exc=True)
                        await self._auto_error_reply(interaction)
                else:
                    log.info(
                        "unknown button custom_id=%s clicked by %s",
                        interaction.custom_id, interaction.user_id,
                    )
                    await self._auto_error_reply(interaction, "That button isn't handled by this bot.")
            else:
                handler = self._slash_handlers.get(interaction.command_name)
                if handler is not None:
                    log.info(
                        "slash invoked: /%s by %s args=%s",
                        interaction.command_name, interaction.user_id, interaction.options,
                    )
                    try:
                        result = handler(interaction)
                        if inspect.isawaitable(result):
                            await result
                    except Exception:
                        log.info("slash handler %r raised", interaction.command_name, exc=True)
                        await self._auto_error_reply(interaction)
                else:
                    log.info(
                        "unknown slash command /%s invoked by %s",
                        interaction.command_name, interaction.user_id,
                    )
                    await self._auto_error_reply(interaction, "That command isn't handled by this bot.")
            await self._fire("on_interaction", interaction)
            return

    async def _auto_error_reply(self, interaction, message="Command failed."):
        if interaction._responded:
            return
        try:
            await interaction.respond(message, ephemeral=True)
        except Exception:
            log.debug("auto error reply send failed; original handler error already logged")

    async def _fire(self, name, *args):
        handler = self._handlers.get(name)
        if handler is None:
            return
        try:
            result = handler(*args)
            if inspect.isawaitable(result):
                await result
        except Exception:
            log.info("handler %s raised", name, exc=True)

    async def send_message(self, channel_id, content="", embed=None, reply_to="", file=None, files=None, components=None):
        attachment_ids = []
        if file is not None and files:
            raise ValueError("pass either file= or files=, not both")
        uploads = [file] if file is not None else (list(files) if files else [])
        for f in uploads:
            res = await self._http.upload_attachment(channel_id, f)
            if res and res.get("id"):
                attachment_ids.append(res["id"])
        wire_components = components
        if wire_components is None and embed is not None and hasattr(embed, "pending_components"):
            pending = embed.pending_components()
            if pending:
                wire_components = pending
        d = await self._http.send_message(
            channel_id,
            content=content,
            embed=embed,
            reply_to=reply_to,
            attachment_ids=attachment_ids or None,
            components=wire_components,
        )
        return Message.from_dict(d, client=self) if d else None

    async def get_user(self, user_id):
        d = await self._http.get_user(user_id)
        return User.from_dict(d) if d else None

    async def get_guild(self, guild_id):
        d = await self._http.get_guild(guild_id)
        return Guild.from_dict(d) if d else None

    async def edit_guild(self, guild_id, *, name=None, description=None, welcome_channel_id=None):
        d = await self._http.edit_guild(
            guild_id,
            name=name,
            description=description,
            welcome_channel_id=welcome_channel_id,
        )
        return Guild.from_dict(d) if d else None

    async def get_member(self, guild_id, user_id):
        d = await self._http.get_member(guild_id, user_id)
        return Member.from_dict(d, guild_id=guild_id) if d else None

    async def list_channels(self, guild_id):
        d = await self._http.list_channels(guild_id)
        return [Channel.from_dict(c, client=self) for c in (d or [])]

    async def get_channel(self, channel_id):
        d = await self._http.get_channel(channel_id)
        return Channel.from_dict(d, client=self) if d else None

    async def list_roles(self, guild_id):
        from .models import Role
        d = await self._http.list_roles(guild_id)
        return [Role.from_dict(r, client=self) for r in (d or [])]

    async def everyone_role(self, guild_id):
        roles = await self.list_roles(guild_id)
        if not roles:
            return None
        return max(roles, key=lambda r: getattr(r, "position", 0))

    async def create_channel(self, guild_id, name, **kwargs):
        d = await self._http.create_channel(guild_id, name, **kwargs)
        return Channel.from_dict(d, client=self) if d else None

    async def edit_channel(self, channel_id, **patch):
        return await self._http.edit_channel(channel_id, **patch)

    async def delete_channel(self, channel_id):
        return await self._http.delete_channel(channel_id)

    async def reorder_channels(self, guild_id, items):
        return await self._http.reorder_channels(guild_id, items)

    async def purge_channel(self, channel_id, limit=100):
        resp = await self._http.purge_channel(channel_id, limit=limit)
        return (resp or {}).get("deleted", 0)

    async def set_channel_permissions(self, channel_id, role_id, *, allow=0, deny=0):
        return await self._http.set_channel_permissions(channel_id, role_id, allow=allow, deny=deny)

    async def list_categories(self, guild_id):
        from .models import Category
        d = await self._http.list_categories(guild_id)
        return [Category.from_dict(c, client=self) for c in (d or [])]

    async def create_category(self, guild_id, name, *, permission_overrides=None):
        from .models import Category
        d = await self._http.create_category(guild_id, name, permission_overrides=permission_overrides)
        return Category.from_dict(d, client=self) if d else None

    async def edit_category(self, category_id, **patch):
        return await self._http.edit_category(category_id, **patch)

    async def delete_category(self, category_id):
        return await self._http.delete_category(category_id)

    async def reorder_categories(self, guild_id, items):
        return await self._http.reorder_categories(guild_id, items)

    async def set_category_permissions(self, category_id, role_id, *, allow=0, deny=0):
        return await self._http.set_category_permissions(category_id, role_id, allow=allow, deny=deny)

    async def create_role(self, guild_id, name, **kwargs):
        from .models import Role
        d = await self._http.create_role(guild_id, name, **kwargs)
        return Role.from_dict(d, client=self) if d else None

    async def _start(self, token):
        import random
        self._loop = asyncio.get_running_loop()
        self._http = HTTPClient(token, base_url=self.base_url)
        self._gateway = Gateway(token, self.intents, self.ws_url, self._dispatch)
        attempts = 0
        try:
            while True:
                connected_at = None
                try:
                    await self._gateway.connect()
                    connected_at = self._loop.time()
                    attempts = 0
                    await self._gateway.run()
                except LoginFailure as e:
                    log.info("LOGIN FAILED: %s — check your bot token", e)
                    break
                except GatewayError as e:
                    log.info("gateway error: %s", e)
                if connected_at is not None and self._loop.time() - connected_at < 60:
                    attempts += 1
                code = self._gateway.close_code
                reason = self._gateway.close_reason
                if code in (4001, 4004, 4010):
                    label = {
                        4001: "BANNED",
                        4004: "INVALID TOKEN",
                        4010: "PROTOCOL VIOLATION",
                    }[code]
                    log.info("DISCONNECTED code=%s (%s) reason=%s — not reconnecting", code, label, reason)
                    break
                if not self.reconnect:
                    break
                resume = None
                if self._gateway.invalid_session or code == 4007:
                    self.session_id = ""
                elif self.session_id and self._gateway.last_seq >= 0:
                    resume = (self.session_id, self._gateway.last_seq)
                base = min(60, 2 ** min(attempts, 6))
                delay = base * (0.75 + random.random() * 0.5)
                mode = "resume" if resume else "fresh"
                if code:
                    log.info("disconnected code=%s reason=%s mode=%s — reconnecting in %.1fs (attempt %d)", code, reason, mode, delay, attempts + 1)
                else:
                    log.info("reconnecting in %.1fs (attempt %d)", delay, attempts + 1)
                await self._gateway.close()
                self._gateway = Gateway(token, self.intents, self.ws_url, self._dispatch, resume=resume)
                await asyncio.sleep(delay)
        finally:
            await self._gateway.close()
            await self._http.close()

    def create_task(self, coro):
        if self._loop is None:
            raise RuntimeError(
                "create_task() called before bot started. Use it from "
                "inside an event handler (on_ready, on_message, ...) — "
                "the loop doesn't exist until bot.run() is called."
            )
        return self._loop.create_task(coro)

    def run(self, token, debug=None):
        if debug is not None:
            self._debug = bool(debug)
            logging.getLogger("banterapi").setLevel(logging.DEBUG if self._debug else logging.INFO)
        try:
            asyncio.run(self._start(token))
        except KeyboardInterrupt:
            pass