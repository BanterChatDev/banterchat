import asyncio
from http import HTTPStatus

import aiohttp

from . import __version__
from .errors import HTTPException, Forbidden, NotFound, DuplicateCommand, RateLimited, LoginFailure
from .logger import Logger

log = Logger(__name__)

_MAX_ATTEMPTS = 2

_DEFAULT_USER_AGENT = f"BanterPy/{__version__} (+https://banterchat.org)"


def _parse_retry_after(raw):
    if not raw:
        return 1.0
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return 1.0
    if value != value or value <= 0:
        return 1.0
    return value


class Route:

    BOT_BASE = "/api/v1/bot"

    __slots__ = ("method", "path", "url")

    def __init__(self, method, path, **params):
        self.method = method
        self.path = path.format(**params) if params else path
        self.url = self.BOT_BASE + self.path

    def __repr__(self):
        return f"Route({self.method!r}, {self.path!r})"


class HTTPClient:

    def __init__(self, token, base_url="https://banterchat.org"):
        self.token = token
        self.base_url = base_url.rstrip("/")
        self._session = None

    async def _ensure_session(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bot {self.token}",
                    "User-Agent": _DEFAULT_USER_AGENT,
                }
            )

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def request(self, route, json_body=None, params=None, extra_headers=None):
        await self._ensure_session()
        url = self.base_url + route.url
        method = route.method
        for attempt in range(_MAX_ATTEMPTS):
            log.debug("HTTP %s %s body_keys=%s params=%s attempt=%d", method, url, list(json_body.keys()) if isinstance(json_body, dict) else type(json_body).__name__, params, attempt)
            async with self._session.request(method, url, json=json_body, params=params, headers=extra_headers) as resp:
                if resp.status == HTTPStatus.NO_CONTENT:
                    log.debug("HTTP %s %s -> 204 No Content", method, url)
                    return None
                text = await resp.text()
                data = None
                if text:
                    try:
                        data = await resp.json(content_type=None)
                    except (aiohttp.ContentTypeError, ValueError):
                        data = {"message": text}
                if HTTPStatus.OK <= resp.status < HTTPStatus.MULTIPLE_CHOICES:
                    log.debug("HTTP %s %s -> %d", method, url, resp.status)
                    return data
                code = (data or {}).get("code", 0)
                message = (data or {}).get("message", text or "unknown error")
                log.info("HTTP %s %s -> %d code=%s message=%s body=%s", method, url, resp.status, code, message, text[:500] if text else "")
                if resp.status == HTTPStatus.TOO_MANY_REQUESTS:
                    retry_after = _parse_retry_after(
                        resp.headers.get("X-RateLimit-Reset-After")
                    )
                    if attempt < _MAX_ATTEMPTS - 1:
                        await asyncio.sleep(retry_after)
                        continue
                    raise RateLimited(resp.status, code, message, retry_after, method=method, path=route.url)
                if resp.status == HTTPStatus.UNAUTHORIZED:
                    raise LoginFailure(message)
                if resp.status == HTTPStatus.FORBIDDEN:
                    raise Forbidden(resp.status, code, message, method=method, path=route.url)
                if resp.status == HTTPStatus.NOT_FOUND:
                    raise NotFound(resp.status, code, message, method=method, path=route.url)
                if code == 20005:
                    http_exc = HTTPException(resp.status, code, message, method=method, path=route.url)
                    name = message.rsplit(":", 1)[-1].strip() if ":" in message else message
                    raise DuplicateCommand(name, source="server", http_exc=http_exc)
                raise HTTPException(resp.status, code, message, method=method, path=route.url)
        raise AssertionError("HTTPClient.request exhausted retries without returning")


    async def me(self):
        return await self.request(Route("GET", "/users/@me"))

    async def download_attachment(self, attachment_id):
        await self._ensure_session()
        url = f"{self.base_url}/api/v1/attachments/{attachment_id}"
        async with self._session.get(url) as resp:
            if resp.status != 200:
                raise HTTPException(resp.status, 0, f"download_attachment {attachment_id} -> {resp.status}", method="GET", path=url)
            return await resp.read()

    async def get_user(self, user_id):
        return await self.request(Route("GET", "/users/{user_id}", user_id=user_id))

    async def get_member(self, guild_id, user_id):
        return await self.request(Route(
            "GET", "/guilds/{guild_id}/members/{user_id}",
            guild_id=guild_id, user_id=user_id,
        ))

    async def list_channels(self, guild_id):
        return await self.request(Route(
            "GET", "/guilds/{guild_id}/channels", guild_id=guild_id,
        ))

    async def get_channel(self, channel_id):
        return await self.request(Route(
            "GET", "/channels/{channel_id}", channel_id=channel_id,
        ))

    async def list_channel_members(self, channel_id, limit=50, offset=0, search=""):
        params = {"limit": limit, "offset": offset}
        if search:
            params["search"] = search
        return await self.request(
            Route("GET", "/channels/{channel_id}/members", channel_id=channel_id),
            params=params,
        )

    async def list_messages(self, channel_id, before="", limit=50):
        params = {"limit": limit}
        if before:
            params["before"] = before
        return await self.request(
            Route("GET", "/channels/{channel_id}/messages", channel_id=channel_id),
            params=params,
        )

    async def send_message(self, channel_id, content="", embed=None, reply_to="", attachment_ids=None, components=None):
        body = {"content": content}
        if embed is not None:
            body["embed"] = embed.to_dict() if hasattr(embed, "to_dict") else embed
        if reply_to:
            body["reply_to"] = reply_to
        if attachment_ids:
            body["attachment_ids"] = list(attachment_ids)
        if components:
            body["components"] = components
        return await self.request(
            Route("POST", "/channels/{channel_id}/messages", channel_id=channel_id),
            json_body=body,
        )

    async def upload_attachment(self, channel_id, file):
        await self._ensure_session()
        route = Route("POST", "/attachments")
        url = self.base_url + route.url
        data = aiohttp.FormData()
        data.add_field("channel_id", channel_id)
        data.add_field("file", file.fp, filename=file.filename, content_type="application/octet-stream")
        for attempt in range(_MAX_ATTEMPTS):
            async with self._session.post(url, data=data) as resp:
                if resp.status == HTTPStatus.NO_CONTENT:
                    return None
                text = await resp.text()
                body = None
                if text:
                    try:
                        body = await resp.json(content_type=None)
                    except (aiohttp.ContentTypeError, ValueError):
                        body = {"message": text}
                if HTTPStatus.OK <= resp.status < HTTPStatus.MULTIPLE_CHOICES:
                    return body
                code = (body or {}).get("code", 0)
                message = (body or {}).get("message") or (body or {}).get("error") or text or "unknown error"
                if resp.status == HTTPStatus.TOO_MANY_REQUESTS:
                    retry_after = _parse_retry_after(resp.headers.get("X-RateLimit-Reset-After"))
                    if attempt < _MAX_ATTEMPTS - 1:
                        await asyncio.sleep(retry_after)
                        continue
                    raise RateLimited(resp.status, code, message, retry_after, method=route.method, path=route.url)
                if resp.status == HTTPStatus.UNAUTHORIZED:
                    raise LoginFailure(message)
                if resp.status == HTTPStatus.FORBIDDEN:
                    raise Forbidden(resp.status, code, message, method=route.method, path=route.url)
                if resp.status == HTTPStatus.NOT_FOUND:
                    raise NotFound(resp.status, code, message, method=route.method, path=route.url)
                raise HTTPException(resp.status, code, message, method=route.method, path=route.url)
        raise AssertionError("upload_attachment exhausted retries without returning")

    async def edit_message(self, message_id, content):
        return await self.request(
            Route("PATCH", "/messages/{message_id}", message_id=message_id),
            json_body={"content": content},
        )

    async def delete_message(self, message_id):
        return await self.request(
            Route("DELETE", "/messages/{message_id}", message_id=message_id),
        )

    async def trigger_typing(self, channel_id):
        return await self.request(
            Route("POST", "/channels/{channel_id}/typing", channel_id=channel_id),
        )

    async def add_reaction(self, channel_id, message_id, emoji):
        return await self.request(Route(
            "PUT",
            "/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me",
            channel_id=channel_id, message_id=message_id, emoji=emoji,
        ))

    async def remove_reaction(self, channel_id, message_id, emoji):
        return await self.request(Route(
            "DELETE",
            "/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me",
            channel_id=channel_id, message_id=message_id, emoji=emoji,
        ))

    async def add_role(self, guild_id, user_id, role_id):
        return await self.request(Route(
            "PUT",
            "/guilds/{guild_id}/members/{user_id}/roles/{role_id}",
            guild_id=guild_id, user_id=user_id, role_id=role_id,
        ))

    async def remove_role(self, guild_id, user_id, role_id):
        return await self.request(Route(
            "DELETE",
            "/guilds/{guild_id}/members/{user_id}/roles/{role_id}",
            guild_id=guild_id, user_id=user_id, role_id=role_id,
        ))

    async def kick_member(self, guild_id, user_id):
        return await self.request(Route(
            "POST", "/guilds/{guild_id}/members/{user_id}/kick",
            guild_id=guild_id, user_id=user_id,
        ))

    async def ban_member(self, guild_id, user_id, reason=""):
        return await self.request(
            Route(
                "POST", "/guilds/{guild_id}/members/{user_id}/ban",
                guild_id=guild_id, user_id=user_id,
            ),
            json_body={"reason": reason},
        )

    async def unban_member(self, guild_id, user_id):
        return await self.request(Route(
            "DELETE", "/guilds/{guild_id}/members/{user_id}/ban",
            guild_id=guild_id, user_id=user_id,
        ))

    async def list_guild_bans(self, guild_id):
        return await self.request(Route(
            "GET", "/guilds/{guild_id}/bans", guild_id=guild_id,
        ))


    async def get_guild(self, guild_id):
        return await self.request(Route(
            "GET", "/guilds/{guild_id}", guild_id=guild_id,
        ))

    async def edit_guild(self, guild_id, *, name=None, description=None, welcome_channel_id=None):
        body = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        if welcome_channel_id is not None:
            body["welcome_channel_id"] = welcome_channel_id
        return await self.request(
            Route("PATCH", "/guilds/{guild_id}", guild_id=guild_id),
            json_body=body,
        )

    async def list_roles(self, guild_id):
        return await self.request(Route(
            "GET", "/guilds/{guild_id}/roles", guild_id=guild_id,
        ))

    async def get_role(self, role_id):
        return await self.request(Route(
            "GET", "/roles/{role_id}", role_id=role_id,
        ))


    async def create_channel(self, guild_id, name, description="", category_id="", type="text", permission_overrides=None):
        from .permissions import _normalize_overrides
        body = {"name": name, "type": type}
        if description:
            body["description"] = description
        if category_id:
            body["category_id"] = category_id
        normalized = _normalize_overrides(permission_overrides)
        if normalized:
            body["permission_overrides"] = normalized
        return await self.request(
            Route("POST", "/guilds/{guild_id}/channels", guild_id=guild_id),
            json_body=body,
        )

    async def edit_channel(self, channel_id, *, name=None, description=None, position=None, category_id=None):
        body = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        if position is not None:
            body["position"] = position
        if category_id is not None:
            body["category_id"] = category_id
        return await self.request(
            Route("PUT", "/channels/{channel_id}", channel_id=channel_id),
            json_body=body,
        )

    async def delete_channel(self, channel_id):
        return await self.request(Route(
            "DELETE", "/channels/{channel_id}", channel_id=channel_id,
        ))

    async def reorder_channels(self, guild_id, items):
        return await self.request(
            Route("PUT", "/guilds/{guild_id}/channels/reorder", guild_id=guild_id),
            json_body={"items": items},
        )


    async def list_categories(self, guild_id):
        return await self.request(Route(
            "GET", "/guilds/{guild_id}/categories", guild_id=guild_id,
        ))

    async def create_category(self, guild_id, name, permission_overrides=None):
        from .permissions import _normalize_overrides
        body = {"name": name}
        normalized = _normalize_overrides(permission_overrides)
        if normalized:
            body["permission_overrides"] = normalized
        return await self.request(
            Route("POST", "/guilds/{guild_id}/categories", guild_id=guild_id),
            json_body=body,
        )

    async def edit_category(self, category_id, *, name=None, position=None):
        body = {}
        if name is not None:
            body["name"] = name
        if position is not None:
            body["position"] = position
        return await self.request(
            Route("PUT", "/categories/{category_id}", category_id=category_id),
            json_body=body,
        )

    async def delete_category(self, category_id):
        return await self.request(Route(
            "DELETE", "/categories/{category_id}", category_id=category_id,
        ))

    async def reorder_categories(self, guild_id, items):
        return await self.request(
            Route("PUT", "/guilds/{guild_id}/categories/reorder", guild_id=guild_id),
            json_body={"items": items},
        )

    async def purge_channel(self, channel_id, limit=100):
        return await self.request(
            Route("POST", "/channels/{channel_id}/messages/purge", channel_id=channel_id),
            json_body={"limit": int(limit)},
        )

    async def set_channel_permissions(self, channel_id, role_id, allow=0, deny=0):
        return await self.request(
            Route("PUT", "/channels/{channel_id}/permissions", channel_id=channel_id),
            json_body={"role_id": role_id, "allow": int(allow), "deny": int(deny)},
        )

    async def set_category_permissions(self, category_id, role_id, allow=0, deny=0):
        return await self.request(
            Route("PUT", "/categories/{category_id}/permissions", category_id=category_id),
            json_body={"role_id": role_id, "allow": int(allow), "deny": int(deny)},
        )


    async def create_role(self, guild_id, name, *, color="", description="", permissions=0, deny=0, position=0, mentionable=False):
        body = {
            "name": name,
            "color": color,
            "description": description,
            "permissions": permissions,
            "deny": deny,
            "position": position,
            "mentionable": mentionable,
        }
        return await self.request(
            Route("POST", "/guilds/{guild_id}/roles", guild_id=guild_id),
            json_body=body,
        )

    async def edit_role(self, role_id, **patch):
        return await self.request(
            Route("PUT", "/roles/{role_id}", role_id=role_id),
            json_body=patch,
        )

    async def delete_role(self, role_id):
        return await self.request(Route(
            "DELETE", "/roles/{role_id}", role_id=role_id,
        ))

    async def register_commands(self, commands):
        return await self.request(
            Route("PUT", "/applications/@me/commands"),
            json_body={"commands": commands},
        )

    async def respond_interaction(self, interaction_id, token, body):
        extra_headers = {"X-Interaction-Token": token}
        return await self.request(
            Route("POST", "/interactions/{interaction_id}/respond", interaction_id=interaction_id),
            json_body=body,
            extra_headers=extra_headers,
        )

    async def list_commands(self):
        return await self.request(Route("GET", "/applications/@me/commands"))