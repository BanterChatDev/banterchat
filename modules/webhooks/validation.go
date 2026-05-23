package webhooks

import (
	"strings"
)

func (s *Service) validateWebhookName(name string, allowEmpty bool) (string, error) {
	n := strings.TrimSpace(name)
	if n == "" {
		if allowEmpty {
			return s.cfg.DefaultName, nil
		}
		return "", ErrInvalidName
	}
	if len(n) > s.cfg.MaxNameLen {
		return "", ErrInvalidName
	}
	return n, nil
}

func (s *Service) validateExecuteBody(body ExecuteBody, attachmentCount int) error {
	if strings.TrimSpace(body.Content) == "" && len(body.Embeds) == 0 && attachmentCount == 0 {
		return ErrInvalidRequest
	}
	if len(body.Content) > s.cfg.MaxContentLen {
		return ErrInvalidRequest
	}
	if len(body.Embeds) > s.cfg.MaxEmbeds {
		return ErrInvalidRequest
	}
	return nil
}