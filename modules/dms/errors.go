package dms

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrNotFound       = errors.New("conversation not found")
	ErrCannotDMSelf   = errors.New("cannot message yourself")
	ErrUserNotFound   = apperr.ErrUserNotFound
	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrServerError    = apperr.ErrServerError
	ErrNotAllowed     = apperr.ErrNotAllowed
)