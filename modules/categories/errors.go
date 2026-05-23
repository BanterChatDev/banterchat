package categories

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrCategoryNotFound = errors.New("category not found")
	ErrCategoryExists   = errors.New("category already exists")
	ErrInvalidName      = errors.New("category name must be 1-30 characters")

	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrServerError    = apperr.ErrServerError
)