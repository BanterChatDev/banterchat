package uiprefs

import "errors"

var (
	ErrInvalidRequest = errors.New("invalid request")
	ErrServerError    = errors.New("internal server error")
)