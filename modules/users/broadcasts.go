package users

func (s *Service) emitUserUpdate(userID string, payload interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_update", payload)
}

func (s *Service) emitUserRoleUpdate(userID string, payload interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_role_update", payload)
}