import functools
from dataclasses import dataclass, field
from typing import List, Optional


def _requires_client(fn):
    @functools.wraps(fn)
    async def wrapper(self, *args, **kwargs):
        if self._client is None:
            raise RuntimeError(f"{type(self).__name__} detached from client")
        return await fn(self, *args, **kwargs)
    return wrapper


@dataclass
class User:

    id: str
    username: str
    display_name: str = ""
    avatar_id: str = ""
    bot: bool = False

    @classmethod
    def from_dict(cls, d):
        return cls(
            id=d.get("id", ""),
            username=d.get("username", ""),
            display_name=d.get("display_name", ""),
            avatar_id=d.get("avatar", "") or d.get("avatar_id", ""),
            bot=d.get("is_bot", False) or d.get("bot", False),
        )


@dataclass
class Role:

    id: str
    name: str
    color: str = ""
    position: int = 0
    permissions: int = 0

    _client: object = field(default=None, repr=False, compare=False)

    @classmethod
    def from_dict(cls, d, client=None):
        return cls(
            id=d.get("id", ""),
            name=d.get("name", ""),
            color=d.get("color", ""),
            position=d.get("position", 0),
            permissions=int(d.get("permissions", 0)),
            _client=client,
        )

    @_requires_client
    async def edit(self, **patch):
        return await self._client._http.edit_role(self.id, **patch)

    @_requires_client
    async def delete(self):
        return await self._client._http.delete_role(self.id)


@dataclass
class Channel:

    id: str
    name: str
    guild_id: str = ""
    type: str = "text"
    description: str = ""
    category_id: str = ""
    permission_overrides: list = field(default_factory=list)

    _client: object = field(default=None, repr=False, compare=False)

    @classmethod
    def from_dict(cls, d, client=None):
        return cls(
            id=d.get("id", ""),
            name=d.get("name", ""),
            guild_id=d.get("guild_id", ""),
            type=d.get("type", "text"),
            description=d.get("description", ""),
            category_id=d.get("category_id", ""),
            permission_overrides=list(d.get("permission_overrides") or []),
            _client=client,
        )

    @_requires_client
    async def send(self, content="", embed=None, file=None, files=None, components=None):
        return await self.bot.send_message(self.channel_id, content=content, embed=embed, file=file, files=files, components=components)

    async def reply(self, content="", embed=None, file=None, files=None, components=None):
        return await self.message.reply(content=content, embed=embed, file=file, files=files, components=components)
    @_requires_client
    async def trigger_typing(self):
        await self._client._http.trigger_typing(self.id)

    @_requires_client
    async def edit(self, **patch):
        return await self._client._http.edit_channel(self.id, **patch)

    @_requires_client
    async def delete(self):
        return await self._client._http.delete_channel(self.id)

    @_requires_client
    async def purge(self, limit=100):
        resp = await self._client._http.purge_channel(self.id, limit=limit)
        return (resp or {}).get("deleted", 0)

    @_requires_client
    async def set_permissions(self, role_id, *, allow=0, deny=0):
        return await self._client._http.set_channel_permissions(
            self.id, role_id, allow=allow, deny=deny,
        )

    @_requires_client
    async def members(self, search="", limit=50, offset=0):
        try:
            resp = await self._client._http.list_channel_members(
                self.id, limit=limit, offset=offset, search=search
            )
        except Exception:
            return []
        users = (resp or {}).get("users") or []
        return [Member.from_dict(u, guild_id=self.guild_id) for u in users]

    @_requires_client
    async def iter_members(self, search="", page_size=200):
        offset = 0
        seen_ids = set()
        while True:
            try:
                resp = await self._client._http.list_channel_members(
                    self.id, limit=page_size, offset=offset, search=search
                )
            except Exception:
                return
            users = (resp or {}).get("users") or []
            if not users:
                return
            for u in users:
                uid = u.get("id", "")
                if uid and uid not in seen_ids:
                    seen_ids.add(uid)
                    yield Member.from_dict(u, guild_id=self.guild_id)
            if len(users) < page_size:
                return
            offset += len(users)


@dataclass
class Member:

    user: User
    guild_id: str
    roles: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, d, guild_id=""):
        return cls(
            user=User.from_dict(d),
            guild_id=guild_id or d.get("guild_id", ""),
            roles=d.get("roles", []) or [],
        )


@dataclass
@dataclass
class Category:

    id: str
    name: str
    guild_id: str = ""
    position: int = 0

    _client: object = field(default=None, repr=False, compare=False)

    @classmethod
    def from_dict(cls, d, client=None):
        return cls(
            id=d.get("id", ""),
            name=d.get("name", ""),
            guild_id=d.get("guild_id", ""),
            position=d.get("position", 0),
            _client=client,
        )

    @_requires_client
    async def edit(self, **patch):
        return await self._client._http.edit_category(self.id, **patch)

    @_requires_client
    async def delete(self):
        return await self._client._http.delete_category(self.id)

    @_requires_client
    async def set_permissions(self, role_id, *, allow=0, deny=0):
        return await self._client._http.set_category_permissions(
            self.id, role_id, allow=allow, deny=deny,
        )


@dataclass
class Guild:

    id: str
    name: str
    owner_id: str = ""
    icon: str = ""
    description: str = ""
    member_count: int = 0
    online_count: int = 0
    default_role_id: str = ""

    @classmethod
    def from_dict(cls, d):
        return cls(
            id=d.get("id", ""),
            name=d.get("name", ""),
            owner_id=d.get("owner_id", ""),
            icon=d.get("icon", ""),
            description=d.get("description", ""),
            member_count=d.get("member_count", 0),
            online_count=d.get("online_count", 0),
            default_role_id=d.get("default_role_id", ""),
        )

    @property
    def everyone_role_id(self):
        return self.default_role_id


@dataclass
class Attachment:

    id: str
    filename: str = ""
    mime_type: str = ""
    size: int = 0
    width: int = 0
    height: int = 0

    _client: object = field(default=None, repr=False, compare=False)

    @classmethod
    def from_dict(cls, d, client=None):
        return cls(
            id=d.get("id", ""),
            filename=d.get("filename", ""),
            mime_type=d.get("mime_type", ""),
            size=int(d.get("size", 0)),
            width=int(d.get("width", 0)),
            height=int(d.get("height", 0)),
            _client=client,
        )

    @property
    def url(self):
        if self._client is None:
            return ""
        return f"{self._client.base_url}/api/v1/attachments/{self.id}"

    @_requires_client
    async def download(self):
        return await self._client._http.download_attachment(self.id)


@dataclass
class Message:

    id: str
    channel_id: str
    user_id: str
    content: str
    author: Optional[User] = None
    guild_id: str = ""
    type: str = "message"
    reply_to: str = ""
    edited: bool = False
    created_at: str = ""
    author_perms: int = 0
    attachments: List["Attachment"] = field(default_factory=list)

    _client: object = field(default=None, repr=False, compare=False)
    _channel_stub: object = field(default=None, init=False, repr=False, compare=False)

    @classmethod
    def from_dict(cls, d, client=None):
        return cls(
            id=d.get("id", ""),
            channel_id=d.get("channel_id", ""),
            user_id=d.get("user_id", ""),
            content=d.get("content", ""),
            author=User.from_dict(d) if d.get("username") else None,
            guild_id=d.get("guild_id", ""),
            type=d.get("type", "message"),
            reply_to=d.get("reply_to", ""),
            edited=d.get("edited", False),
            created_at=d.get("created_at", ""),
            author_perms=int(d.get("author_perms", 0)),
            attachments=[Attachment.from_dict(a, client=client) for a in (d.get("attachments") or [])],
            _client=client,
        )

    @property
    def channel(self):
        if self._client is None:
            raise RuntimeError("Message detached from client")
        if self._channel_stub is None:
            self._channel_stub = Channel(
                id=self.channel_id,
                name="",
                guild_id=self.guild_id,
                _client=self._client,
            )
        return self._channel_stub

    @_requires_client
    async def reply(self, content="", embed=None, file=None, files=None, components=None):
        return await self._client.send_message(self.channel_id, content=content, embed=embed, reply_to=self.id, file=file, files=files, components=components)

    @_requires_client
    async def edit(self, content):
        return await self._client._http.edit_message(self.id, content)

    @_requires_client
    async def delete(self):
        return await self._client._http.delete_message(self.id)

    @_requires_client
    async def add_reaction(self, emoji):
        return await self._client._http.add_reaction(self.channel_id, self.id, emoji)