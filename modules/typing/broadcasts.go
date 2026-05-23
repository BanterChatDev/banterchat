package typing

func (s *Service) emitStart(channelID, userID, username string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "typing_start", map[string]string{"channel_id": channelID, "user_id": userID, "username": username})
}

func (s *Service) emitStop(channelID, userID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "typing_stop", map[string]string{"channel_id": channelID, "user_id": userID})
}