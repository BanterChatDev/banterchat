package threads

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrThreadNotFound      = errors.New("thread not found")
	ErrParentNotFound      = errors.New("parent channel not found")
	ErrParentInvalidType   = errors.New("parent must be a text channel")
	ErrThreadArchived      = errors.New("thread is archived")
	ErrInvalidName         = errors.New("invalid thread name")

	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrNotAllowed     = apperr.ErrNotAllowed
	ErrServerError    = apperr.ErrServerError
)