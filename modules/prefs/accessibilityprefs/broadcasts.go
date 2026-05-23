package accessibilityprefs

func (s *Service) emitChanged(userID string, prefs interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "accessibility_prefs_update", prefs)
}