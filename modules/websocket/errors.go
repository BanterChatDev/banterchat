package websocket

import "errors"

var (
	ErrWSRateLimited    = errors.New("rate limit exceeded")
	ErrTooManyConns     = errors.New("too many connections")
)