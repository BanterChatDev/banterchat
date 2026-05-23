package friends

func (s *Service) emitRequest(userID string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "friend_request", payload)
}

func (s *Service) emitAccepted(userID string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "friend_accepted", payload)
}

func (s *Service) emitRemoved(userID string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "friend_removed", payload)
}

func (s *Service) emitBlockAdd(blockerID, blockID string, user interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(blockerID, "block_add", map[string]interface{}{"id": blockID, "user": user})
}

func (s *Service) emitBlockRemove(blockerID, targetID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(blockerID, "block_remove", map[string]string{"user_id": targetID})
}

func (s *Service) emitPeerBlocked(targetID, blockerID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(targetID, "peer_blocked", map[string]string{"user_id": blockerID})
}

func (s *Service) emitPeerUnblocked(targetID, blockerID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(targetID, "peer_unblocked", map[string]string{"user_id": blockerID})
}