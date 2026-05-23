package notifprefs

func (s *Service) emitChanged(userID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "notif_prefs_changed", nil)
}