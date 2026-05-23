package uiprefs

func (s *Service) emitPrefsUpdate(userID string, prefs interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "prefs_update", prefs)
}

func (s *Service) emitUserUpdate(userID string, payload interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_update", payload)
}