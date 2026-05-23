package keyfile

func (s *Service) emitKeyfileChange(userID, fingerprint string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "keyfile_change", map[string]interface{}{
		"has_keyfile":         fingerprint != "",
		"keyfile_fingerprint": fingerprint,
	})
}