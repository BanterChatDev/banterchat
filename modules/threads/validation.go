package threads

import (
	"fmt"

	"ror/modules/channels"
)

func ValidateThreadName(name string, cfg channels.Config) error {
	if len(name) < cfg.MinName || len(name) > cfg.MaxName {
		return fmt.Errorf("thread name must be %d-%d characters", cfg.MinName, cfg.MaxName)
	}
	return nil
}