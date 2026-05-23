class Permissions:
    SEND_MESSAGES      = 1 << 0
    MANAGE_CHANNELS    = 1 << 1
    MANAGE_ROLES       = 1 << 2
    MANAGE_MESSAGES    = 1 << 3
    ADMINISTRATOR      = 1 << 4
    MENTION_EVERYONE   = 1 << 5
    VIEW_CHANNELS      = 1 << 6
    ATTACH_FILES       = 1 << 7
    BAN_MEMBERS        = 1 << 8
    USE_SLASH_COMMANDS = 1 << 9
    MANAGE_GUILD       = 1 << 10
    KICK_MEMBERS       = 1 << 11

    ALL = (
        SEND_MESSAGES | MANAGE_CHANNELS | MANAGE_ROLES | MANAGE_MESSAGES
        | ADMINISTRATOR | MENTION_EVERYONE | VIEW_CHANNELS | ATTACH_FILES
        | BAN_MEMBERS | USE_SLASH_COMMANDS | MANAGE_GUILD | KICK_MEMBERS
    )


_NAMES = {
    Permissions.SEND_MESSAGES:      "send_messages",
    Permissions.MANAGE_CHANNELS:    "manage_channels",
    Permissions.MANAGE_ROLES:       "manage_roles",
    Permissions.MANAGE_MESSAGES:    "manage_messages",
    Permissions.ADMINISTRATOR:      "administrator",
    Permissions.MENTION_EVERYONE:   "mention_everyone",
    Permissions.VIEW_CHANNELS:      "view_channels",
    Permissions.ATTACH_FILES:       "attach_files",
    Permissions.BAN_MEMBERS:        "ban_members",
    Permissions.USE_SLASH_COMMANDS: "use_slash_commands",
    Permissions.MANAGE_GUILD:       "manage_guild",
    Permissions.KICK_MEMBERS:       "kick_members",
}


def has_perm(bitmask, required):
    if bitmask & Permissions.ADMINISTRATOR:
        return True
    return (bitmask & required) == required


def describe(bitmask):
    return sorted(name for bit, name in _NAMES.items() if bitmask & bit)


class PermissionOverride:

    def __init__(self, role_id, *, allow=0, deny=0):
        self.role_id = role_id
        self.allow = int(allow)
        self.deny = int(deny)

    @classmethod
    def allowing(cls, role_id, bits):
        return cls(role_id, allow=bits, deny=0)

    @classmethod
    def denying(cls, role_id, bits):
        return cls(role_id, allow=0, deny=bits)

    def to_dict(self):
        return {"role_id": self.role_id, "allow": self.allow, "deny": self.deny}

    def __repr__(self):
        return f"PermissionOverride(role_id={self.role_id!r}, allow={self.allow}, deny={self.deny})"


def _normalize_overrides(overrides):
    if not overrides:
        return None
    out = []
    for p in overrides:
        if isinstance(p, PermissionOverride):
            out.append(p.to_dict())
        elif isinstance(p, dict):
            out.append({
                "role_id": p.get("role_id", ""),
                "allow":   int(p.get("allow", 0)),
                "deny":    int(p.get("deny", 0)),
            })
    return out