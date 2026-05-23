package auth

import (
	"fmt"
)

func ValidatePassword(password string, cfg Config) error {
	if len(password) < cfg.MinPassword {
		return fmt.Errorf(errFmtBadPassword, cfg.MinPassword)
	}
	if len(password) > cfg.MaxPassword {
		return fmt.Errorf("password must be at most %d characters", cfg.MaxPassword)
	}
	return nil
}