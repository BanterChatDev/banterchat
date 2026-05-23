package bots

func (s *Service) emitBotUpdate(botUserID string, payload interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(botUserID, "user_update", payload)
}

func (s *Service) emitCommandsUpdated(guildID, botUserID string) {
	s.hub.EmitBotCommandsUpdated(guildID, botUserID)
}