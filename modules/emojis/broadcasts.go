package emojis

func (s *Service) emitCreate(guildID string, emoji EmojiJSON) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "guild_emoji_create", map[string]interface{}{"emoji": emoji})
}

func (s *Service) emitUpdate(guildID string, emoji EmojiJSON) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "guild_emoji_update", map[string]interface{}{"emoji": emoji})
}

func (s *Service) emitDelete(guildID, emojiID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "guild_emoji_delete", map[string]string{"id": emojiID, "guild_id": guildID})
}