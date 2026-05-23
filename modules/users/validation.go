package users

import "fmt"

func ValidateBio(bio string, cfg Config) error {
	if len(bio) > cfg.MaxBioLen {
		return fmt.Errorf(errFmtBioTooLong, cfg.MaxBioLen)
	}
	return nil
}