package auth

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrUsernameTaken      = errors.New("username already taken")
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrSessionExpired     = errors.New("session expired")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrHashFailed         = errors.New("failed to process password")
	ErrSessionNotFound    = errors.New("session not found")
	ErrCannotRevokeSelf   = errors.New("cannot revoke current session")
	ErrInsufficientPerms  = errors.New("insufficient permissions")
	ErrBanned             = errors.New("you are banned")
	ErrSuspended          = errors.New("your account is suspended")
	ErrTooManyRegistrations = errors.New("too many accounts created from this IP, try again later")
	ErrBotDetected          = errors.New("access denied")
	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrServerError    = apperr.ErrServerError
)

const (
	errFmtBadPassword = "password must be at least %d characters"
)