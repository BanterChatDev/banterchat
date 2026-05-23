package ratelimit

import "errors"

var (
	ErrRateLimitExceeded = errors.New("rate limit exceeded, please slow down")
)