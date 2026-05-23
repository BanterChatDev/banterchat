package avatar

import (
	"errors"
	"fmt"

	"ror/modules/apperr"
	"ror/modules/fileutil"
)

var (
	ErrNoFile      = errors.New("no file provided")
	ErrTooLarge    = errors.New("avatar too large (max 4 MB)")
	ErrInvalidType = fmt.Errorf("only %s allowed", fileutil.AllowedAvatarNames)
	ErrNotFound    = errors.New("avatar not found")

	ErrServerError = apperr.ErrServerError
)