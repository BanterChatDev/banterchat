package bots

const (
	IntentGuilds            int64 = 1 << 0
	IntentGuildMembers      int64 = 1 << 1
	IntentGuildModeration   int64 = 1 << 2
	IntentGuildPresences    int64 = 1 << 3
	IntentGuildMessages     int64 = 1 << 4
	IntentGuildReactions    int64 = 1 << 5
	IntentGuildTyping       int64 = 1 << 6
	IntentGuildVoiceStates  int64 = 1 << 7
	IntentDirectMessages    int64 = 1 << 8
	IntentDirectReactions   int64 = 1 << 9
	IntentDirectTyping      int64 = 1 << 10
	IntentMessageContent    int64 = 1 << 11
	IntentBotEvents         int64 = 1 << 12
)

func EventIntent(eventType string) int64 {
	switch eventType {
	case "channel_message", "message_create", "message_edit", "message_delete", "message_delete_bulk":
		return IntentGuildMessages
	case "reaction_add", "reaction_remove":
		return IntentGuildReactions
	case "typing_start", "typing_stop":
		return IntentGuildTyping
	case "guild_member_add", "guild_member_remove", "guild_member_role_update":
		return IntentGuildMembers
	case "guild_ban_add", "guild_ban_remove":
		return IntentGuildModeration
	case "guild_create", "guild_update", "guild_delete":
		return IntentGuilds
	case "channel_create", "channel_update", "channel_delete", "channel_reorder", "category_create", "category_update", "category_delete", "category_reorder":
		return IntentGuilds
	case "role_create", "role_update", "role_delete":
		return IntentGuilds
	case "user_online", "user_offline", "guild_presence":
		return IntentGuildPresences
	case "voicePeers":
		return IntentGuildVoiceStates
	case "ready", "interaction_create", "error":
		return IntentBotEvents
	}
	return 0
}