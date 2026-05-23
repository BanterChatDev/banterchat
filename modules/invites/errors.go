package invites

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrNotAllowed      = apperr.ErrNotAllowed
	ErrServerError     = apperr.ErrServerError
	ErrInviteNotFound  = errors.New("invite not found or expired")
	ErrInviteUnusable  = errors.New("invite is no longer valid")
)