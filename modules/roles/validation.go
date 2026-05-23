package roles

import (
	"fmt"
	"regexp"
)

var hexColorRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func ValidateRoleName(name string, cfg Config) error {
	if len(name) < cfg.MinName || len(name) > cfg.MaxName {
		return fmt.Errorf(errFmtInvalidName, cfg.MinName, cfg.MaxName)
	}
	return nil
}

func ValidateRoleDescription(desc string, cfg Config) error {
	if len(desc) > cfg.MaxDesc {
		return fmt.Errorf(errFmtInvalidDescription, cfg.MaxDesc)
	}
	return nil
}

func ValidateColor(color string) error {
	if !hexColorRe.MatchString(color) {
		return ErrInvalidColor
	}
	return nil
}