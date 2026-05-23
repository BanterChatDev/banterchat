package users

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrBioTooLong          = errors.New("bio is too long")
	ErrRoleIDRequired      = errors.New("role_id is required")
	ErrRoleNotFound        = errors.New("role not found")
	ErrCannotRemoveDefault = errors.New("cannot remove default role")
	ErrRoleHierarchy       = errors.New("cannot manage a role at or above your rank")

	ErrUserNotFound   = apperr.ErrUserNotFound
	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrServerError    = apperr.ErrServerError
	ErrNotAllowed     = apperr.ErrNotAllowed

	errDisplayNameTooLong = errors.New("display name must be 32 characters or fewer")
)

const (
	errFmtBioTooLong = "bio must be at most %d characters"
)