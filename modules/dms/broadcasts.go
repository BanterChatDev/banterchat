package dms

func (s *Service) emitClosed(userID, convID, peerID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "dm_closed", map[string]string{
		"conversation_id": convID,
		"peer_id":         peerID,
	})
}

func (s *Service) emitReopened(userID string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "dm_reopened", payload)
}