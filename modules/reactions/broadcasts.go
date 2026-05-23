package reactions

func (s *Service) emitAdd(channelID, messageID, emojiID, name, userID, username string, count int) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "reaction_add", map[string]interface{}{
		"message_id": messageID, "channel_id": channelID, "emoji_id": emojiID, "name": name, "user_id": userID, "username": username, "count": count,
	})
}

func (s *Service) emitRemove(channelID, messageID, emojiID, name, userID, username string, count int) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "reaction_remove", map[string]interface{}{
		"message_id": messageID, "channel_id": channelID, "emoji_id": emojiID, "name": name, "user_id": userID, "username": username, "count": count,
	})
}