def _merge_components(embed, components):
    if components is not None:
        return components
    if embed is not None and hasattr(embed, "pending_components"):
        pending = embed.pending_components()
        if pending:
            return pending
    return None


class Interaction:

    __slots__ = (
        "id", "token", "app_id", "type", "command_name", "custom_id",
        "message_id", "options", "guild_id", "channel_id", "user_id",
        "_client", "_responded",
    )

    def __init__(self, payload, client=None):
        self.id = payload.get("id", "")
        self.token = payload.get("token", "")
        self.app_id = payload.get("app_id", "")
        self.type = payload.get("type", "slash") or "slash"
        self.command_name = payload.get("command_name", "")
        self.custom_id = payload.get("custom_id", "")
        self.message_id = payload.get("message_id", "") or payload.get("source_message_id", "")
        self.options = payload.get("options", {}) or {}
        self.guild_id = payload.get("guild_id", "")
        self.channel_id = payload.get("channel_id", "")
        self.user_id = payload.get("user_id", "")
        self._client = client
        self._responded = False

    @property
    def is_button(self):
        return self.type == "button"

    @property
    def is_slash(self):
        return self.type == "slash"

    async def respond(self, content="", *, embed=None, ephemeral=False, components=None):
        if self._client is None:
            raise RuntimeError("Interaction has no attached client.")
        if not content and embed is None:
            raise ValueError("respond() requires non-empty content or an embed")
        if self._responded:
            return await self.followup(content, embed=embed, ephemeral=ephemeral, components=components)
        body = {
            "kind": "reply",
            "content": content,
            "ephemeral": bool(ephemeral),
        }
        if embed is not None:
            body["embed"] = embed.to_dict() if hasattr(embed, "to_dict") else embed
        comps = _merge_components(embed, components)
        if comps is not None:
            body["components"] = comps
        await self._client._http.respond_interaction(self.id, self.token, body)
        self._responded = True

    async def defer(self, *, ephemeral=False):
        if self._responded:
            raise RuntimeError("interaction already responded to")
        if self._client is None:
            raise RuntimeError("Interaction has no attached client.")
        await self._client._http.respond_interaction(self.id, self.token, {
            "kind": "defer",
            "ephemeral": bool(ephemeral),
        })
        self._responded = True

    async def followup(self, content="", *, embed=None, ephemeral=False, components=None, reply_to=""):
        if self._client is None:
            raise RuntimeError("Interaction has no attached client.")
        if not content and embed is None:
            raise ValueError("followup() requires non-empty content or an embed")
        body = {
            "kind": "followup",
            "content": content,
            "ephemeral": bool(ephemeral),
        }
        if embed is not None:
            body["embed"] = embed.to_dict() if hasattr(embed, "to_dict") else embed
        comps = _merge_components(embed, components)
        if comps is not None:
            body["components"] = comps
        if reply_to:
            body["reply_to"] = reply_to
        await self._client._http.respond_interaction(self.id, self.token, body)

    async def update(self, content="", *, embed=None, components=None):
        if self.type != "button":
            raise RuntimeError(
                "update() is only valid for button interactions — use "
                "respond() or followup() for slash commands."
            )
        if self._responded:
            raise RuntimeError("interaction already responded to")
        if self._client is None:
            raise RuntimeError("Interaction has no attached client.")
        body = {"kind": "update", "content": content}
        if embed is not None:
            body["embed"] = embed.to_dict() if hasattr(embed, "to_dict") else embed
        comps = _merge_components(embed, components)
        if comps is not None:
            body["components"] = comps
        await self._client._http.respond_interaction(self.id, self.token, body)
        self._responded = True

    def __repr__(self):
        if self.is_button:
            return (
                f"Interaction(type=button, id={self.id!r}, custom_id={self.custom_id!r}, "
                f"message={self.message_id!r}, user={self.user_id!r}, channel={self.channel_id!r})"
            )
        return (
            f"Interaction(type=slash, id={self.id!r}, app={self.app_id!r}, command={self.command_name!r}, "
            f"user={self.user_id!r}, channel={self.channel_id!r})"
        )