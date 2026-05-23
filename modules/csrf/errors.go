package csrf

import "errors"

var (
	ErrInvalidToken = errors.New("invalid csrf token")
	ErrMissingToken = errors.New("missing csrf token")
)