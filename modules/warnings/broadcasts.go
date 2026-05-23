package warnings

import "time"

func (s *Service) emitIssued(targetID, wid string, reasons []string, note string, sev int) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(targetID, "warning_issued", map[string]any{
		"id":         wid,
		"reasons":    reasons,
		"note":       note,
		"severity":   sev,
		"created_at": time.Now(),
	})
}