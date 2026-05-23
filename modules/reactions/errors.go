package reactions

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrReactionLimit  = errors.New("too many unique reactions on this message")
	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrNotAllowed     = apperr.ErrNotAllowed
	ErrServerError    = apperr.ErrServerError
)