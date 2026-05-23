package roles

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrRoleNotFound       = errors.New("role not found")
	ErrRoleExists         = errors.New("role already exists")
	ErrInvalidName        = errors.New("invalid role name")
	ErrInvalidColor       = errors.New("color must be a valid hex code")
	ErrInvalidDescription = errors.New("description too long")
	ErrCannotDeletePreset = errors.New("cannot delete preset role")
	ErrRoleHierarchy      = errors.New("cannot manage a role at or above your rank")

	ErrServerError    = apperr.ErrServerError
	ErrInvalidRequest = apperr.ErrInvalidRequest
)

const (
	errFmtInvalidName        = "role name must be %d-%d characters"
	errFmtInvalidDescription = "description must be at most %d characters"
)