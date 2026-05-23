package channels

import "fmt"

func ValidateChannelName(name string, cfg Config) error {
	if len(name) < cfg.MinName || len(name) > cfg.MaxName {
		return fmt.Errorf(errFmtInvalidName, cfg.MinName, cfg.MaxName)
	}
	return nil
}