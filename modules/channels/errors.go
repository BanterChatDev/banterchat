package channels

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrChannelNotFound     = errors.New("channel not found")
	ErrChannelExists       = errors.New("channel already exists")
	ErrInvalidName         = errors.New("invalid channel name")

	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrNotAllowed     = apperr.ErrNotAllowed
	ErrServerError    = apperr.ErrServerError
)

const (
	errFmtInvalidName = "channel name must be %d-%d characters"
)