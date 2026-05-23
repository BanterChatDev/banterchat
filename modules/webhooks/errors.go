package webhooks

import (
	"errors"

	"ror/modules/apperr"
)

var (
	ErrWebhookNotFound = errors.New("webhook not found")
	ErrInvalidName     = errors.New("name must be 1-80 characters")
	ErrChannelRequired = errors.New("channel id required")
	ErrChannelNoGuild  = errors.New("channel must belong to a server")

	ErrInvalidRequest = apperr.ErrInvalidRequest
	ErrNotAllowed     = apperr.ErrNotAllowed
	ErrServerError    = apperr.ErrServerError
)