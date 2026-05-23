import inspect
import shlex

from .errors import MissingPermissions
from .permissions import has_perm, describe


class CommandError(Exception):
    pass


class CommandNotFound(CommandError):
    pass


class MissingArgument(CommandError):

    def __init__(self, name):
        self.name = name
        super().__init__(f"missing required argument: {name}")


class BadArgument(CommandError):

    def __init__(self, name, value, expected):
        self.name = name
        self.value = value
        self.expected = expected
        super().__init__(f"argument {name!r} expected {expected}, got {value!r}")


_BOOL_TRUE = {"true", "yes", "y", "1", "on", "enable"}
_BOOL_FALSE = {"false", "no", "n", "0", "off", "disable"}


def _convert(value, annotation, name):
    if annotation is inspect.Parameter.empty or annotation is str:
        return value
    if annotation is int:
        try:
            return int(value)
        except ValueError:
            raise BadArgument(name, value, "integer")
    if annotation is float:
        try:
            return float(value)
        except ValueError:
            raise BadArgument(name, value, "number")
    if annotation is bool:
        v = value.lower()
        if v in _BOOL_TRUE:
            return True
        if v in _BOOL_FALSE:
            return False
        raise BadArgument(name, value, "yes/no")
    return value


class Context:

    def __init__(self, bot, message, invoked_with, args_raw):
        self.bot = bot
        self.message = message
        self.invoked_with = invoked_with
        self.args_raw = args_raw
        self.author = message.author
        self.author_perms = message.author_perms
        self.channel = message.channel
        self.channel_id = message.channel_id
        self.guild_id = message.guild_id

    def has_permissions(self, required):
        return has_perm(self.author_perms, required)

    async def send(self, content="", embed=None, file=None, files=None):
        return await self.bot.send_message(self.channel_id, content=content, embed=embed, file=file, files=files)

    async def reply(self, content="", embed=None, file=None, files=None):
        return await self.message.reply(content=content, embed=embed, file=file, files=files)

    async def trigger_typing(self):
        await self.bot._http.trigger_typing(self.channel_id)


def has_permissions(*required):
    required_mask = 0
    for r in required:
        required_mask |= r
    def decorator(fn):
        existing = getattr(fn, "_required_perms", 0)
        fn._required_perms = existing | required_mask
        return fn
    return decorator


class Command:

    def __init__(self, func, name=None, aliases=None, help=None, category=None):
        self.callback = func
        self.name = name or func.__name__
        self.aliases = tuple(aliases or ())
        self.help = help or (func.__doc__ or "").strip()
        self.category = category
        sig = inspect.signature(func)
        params = list(sig.parameters.values())
        if not params:
            raise ValueError(f"command {self.name!r} must accept a context argument")
        self.params = params[1:]

    def _parse(self, ctx, args_raw):
        try:
            tokens = shlex.split(args_raw) if args_raw else []
        except ValueError:
            tokens = args_raw.split() if args_raw else []

        positional = []
        kwargs = {}
        i = 0
        for p in self.params:
            if p.kind is inspect.Parameter.VAR_POSITIONAL:
                remaining = tokens[i:]
                positional.extend(_convert(t, p.annotation, p.name) for t in remaining)
                i = len(tokens)
                break
            if p.kind is inspect.Parameter.KEYWORD_ONLY:
                remaining = args_raw
                for _ in range(i):
                    remaining = remaining.split(maxsplit=1)[1] if " " in remaining else ""
                remaining = remaining.strip()
                if not remaining and p.default is inspect.Parameter.empty:
                    raise MissingArgument(p.name)
                kwargs[p.name] = remaining if remaining else p.default
                i = len(tokens)
                break
            if i >= len(tokens):
                if p.default is inspect.Parameter.empty:
                    raise MissingArgument(p.name)
                positional.append(p.default)
            else:
                positional.append(_convert(tokens[i], p.annotation, p.name))
                i += 1
        return positional, kwargs

    @property
    def required_perms(self):
        return getattr(self.callback, "_required_perms", 0)

    async def invoke(self, ctx):
        req = self.required_perms
        if req and not has_perm(ctx.author_perms, req):
            missing_bits = req & ~ctx.author_perms
            raise MissingPermissions(describe(missing_bits))
        positional, kwargs = self._parse(ctx, ctx.args_raw)
        result = self.callback(ctx, *positional, **kwargs)
        if inspect.isawaitable(result):
            await result


class CommandRegistry:

    def __init__(self):
        self._commands = {}

    def add(self, command):
        self._commands[command.name] = command
        for alias in command.aliases:
            self._commands[alias] = command

    def get(self, name):
        return self._commands.get(name)

    def all(self):
        seen = set()
        out = []
        for cmd in self._commands.values():
            if cmd.name in seen:
                continue
            seen.add(cmd.name)
            out.append(cmd)
        return out



OPTION_STRING = "string"
OPTION_INTEGER = "integer"
OPTION_BOOLEAN = "boolean"
OPTION_USER = "user"
OPTION_CHANNEL = "channel"
OPTION_ROLE = "role"

_VALID_OPTION_TYPES = {
    OPTION_STRING, OPTION_INTEGER, OPTION_BOOLEAN,
    OPTION_USER, OPTION_CHANNEL, OPTION_ROLE,
}


class SlashOption:

    __slots__ = ("name", "type", "description", "required", "choices")

    def __init__(self, name, *, type=OPTION_STRING, description="", required=True, choices=None):
        if type not in _VALID_OPTION_TYPES:
            raise ValueError(
                f"SlashOption {name!r}: unknown type {type!r}. "
                f"Use one of: {', '.join(sorted(_VALID_OPTION_TYPES))}"
            )
        self.name = name
        self.type = type
        self.description = description
        self.required = bool(required)
        self.choices = list(choices) if choices else None

    def to_dict(self):
        d = {
            "name": self.name,
            "type": self.type,
            "description": self.description,
            "required": self.required,
        }
        if self.choices is not None:
            normalized = []
            for c in self.choices:
                if isinstance(c, dict) and "value" in c:
                    normalized.append({"name": str(c.get("name", c["value"])), "value": c["value"]})
                else:
                    normalized.append({"name": str(c), "value": c})
            d["choices"] = normalized
        return d

    def __repr__(self):
        req = "required" if self.required else "optional"
        return f"SlashOption({self.name!r}, type={self.type!r}, {req})"


def Optional(name, *, type=OPTION_STRING, description="", choices=None):
    return SlashOption(name, type=type, description=description, required=False, choices=choices)