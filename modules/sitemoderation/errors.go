package sitemoderation

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrCannotTerminateSelf      = errors.New("cannot terminate yourself")
	ErrCannotTerminateSiteAdmin = errors.New("cannot terminate a site admin")

	ErrServerError = apperr.ErrServerError
)
