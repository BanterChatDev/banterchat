package apperr

import "errors"

var (
	ErrInvalidRequest = errors.New("invalid request")
	ErrServerError    = errors.New("server error")
	ErrNotAllowed     = errors.New("not allowed")
	ErrFileTooLarge   = errors.New("file too large")
	ErrNotFound       = errors.New("not found")
	ErrUserNotFound   = errors.New("user not found")
)