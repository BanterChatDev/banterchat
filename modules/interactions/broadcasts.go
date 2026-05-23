package interactions

func (s *Service) emitCreate(targetUserID string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(targetUserID, "interaction_create", payload)
}

func (s *Service) emitReply(channelID, invokerUserID string, ephemeral bool, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	if ephemeral {
		s.hub.EmitTo(invokerUserID, "interaction_reply", payload)
		return
	}
	s.hub.EmitToChannel(channelID, "interaction_reply", payload)
}

func (s *Service) emitError(userID, kind, command, message string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "interaction_error", map[string]interface{}{
		"kind":    kind,
		"command": command,
		"message": message,
	})
}