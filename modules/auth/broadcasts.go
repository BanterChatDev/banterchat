package auth

func (s *Service) emitSessionChange(userID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "session_change", map[string]interface{}{})
}