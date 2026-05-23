package admin

import (
	"errors"

	"ror/modules/apperr"
)

var (
	ErrUserNotFound       = errors.New("user not found")
	ErrGuildNotFound      = errors.New("guild not found")
	ErrCannotActOnSelf    = errors.New("cannot perform this action on yourself")
	ErrCannotActOnAdmin   = errors.New("cannot perform this action on a site admin")
	ErrInvalidUntil       = errors.New("invalid until")
	ErrUntilInPast        = errors.New("until in the past")
	ErrAlreadySiteAdmin   = errors.New("already a site admin")
	ErrConfigAdminLocked  = errors.New("config-defined site admins cannot be demoted at runtime")
	ErrNotRuntimeAdmin    = errors.New("not a runtime site admin")
	ErrTerminateFailed    = errors.New("could not terminate")
	ErrDeleteFailed       = errors.New("delete failed")

	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrServerError    = apperr.ErrServerError
)