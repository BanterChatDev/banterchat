package messages

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrEmptyContent = errors.New("message content cannot be empty")
	ErrTooLong      = errors.New("message too long")
	ErrNotFound     = errors.New("message not found")

	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrServerError    = apperr.ErrServerError
	ErrNotAllowed     = apperr.ErrNotAllowed
)

type SendBlockedErr struct {
	Reason string
}

func (e *SendBlockedErr) Error() string {
	return e.Reason
}

type SlowmodeErr struct {
	RetryAfter int
}

func (e *SlowmodeErr) Error() string {
	return "slowmode"
}

const (
	errFmtTooLong = "message too long (max %d characters)"
)