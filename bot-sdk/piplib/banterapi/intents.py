class Intents:
    GUILDS = 1 << 0
    GUILD_MEMBERS = 1 << 1
    GUILD_MODERATION = 1 << 2
    GUILD_PRESENCES = 1 << 3
    GUILD_MESSAGES = 1 << 4
    GUILD_REACTIONS = 1 << 5
    GUILD_TYPING = 1 << 6
    GUILD_VOICE_STATES = 1 << 7
    DIRECT_MESSAGES = 1 << 8
    DIRECT_REACTIONS = 1 << 9
    DIRECT_TYPING = 1 << 10
    MESSAGE_CONTENT = 1 << 11
    BOT_EVENTS = 1 << 12

    def __init__(self, value=0):
        self.value = value

    def __or__(self, other):
        if isinstance(other, Intents):
            return Intents(self.value | other.value)
        return Intents(self.value | int(other))

    def __int__(self):
        return self.value

    @classmethod
    def default(cls):
        return cls(
            cls.GUILDS
            | cls.GUILD_MESSAGES
            | cls.GUILD_REACTIONS
            | cls.GUILD_MEMBERS
            | cls.BOT_EVENTS
        )

    @classmethod
    def all(cls):
        return cls(
            cls.GUILDS
            | cls.GUILD_MEMBERS
            | cls.GUILD_MODERATION
            | cls.GUILD_PRESENCES
            | cls.GUILD_MESSAGES
            | cls.GUILD_REACTIONS
            | cls.GUILD_TYPING
            | cls.GUILD_VOICE_STATES
            | cls.DIRECT_MESSAGES
            | cls.DIRECT_REACTIONS
            | cls.DIRECT_TYPING
            | cls.MESSAGE_CONTENT
            | cls.BOT_EVENTS
        )

    @classmethod
    def none(cls):
        return cls(0)