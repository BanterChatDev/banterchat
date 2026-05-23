package warnings

import "time"

func (s *Service) emitIssued(targetID, wid string, reasons []string, note string, sev int, message string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(targetID, "warning_issued", map[string]any{
		"id":         wid,
		"reasons":    reasons,
		"note":       note,
		"severity":   sev,
		"message":    message,
		"created_at": time.Now(),
	})
}