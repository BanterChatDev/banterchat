package avatar

func (s *Service) emitUserUpdate(userID string, payload interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_update", payload)
}

func (s *Service) emitGuildUpdate(guildID string, payload map[string]interface{}) {
	if s.EmitGuildUpdate == nil {
		return
	}
	s.EmitGuildUpdate(guildID, payload)
}