package reports

func (s *Service) emitNew(payload interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("report", payload)
}

func (s *Service) emitResolved(reportID, resolvedBy, action string) {
	if s.hub == nil {
		return
	}
	resolvedByUsername := ""
	if s.users != nil {
		resolvedByUsername = s.users.DecryptUsernameByID(resolvedBy)
	}
	s.hub.EmitToSiteAdmins("report_resolved", map[string]string{
		"id":                   reportID,
		"resolved_by":          resolvedBy,
		"resolved_by_username": resolvedByUsername,
		"resolution_action":    action,
	})
}