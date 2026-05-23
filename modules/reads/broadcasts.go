package reads

func (s *Service) emitMarkRead(userID, channelID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "mark_read", map[string]string{"channel_id": channelID})
}