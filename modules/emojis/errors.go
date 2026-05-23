package emojis

import (
	"errors"
	"ror/modules/apperr"
)

var (
	ErrNotAllowed     = apperr.ErrNotAllowed
	ErrServerError    = apperr.ErrServerError
	ErrNoFile         = errors.New("no file uploaded")
	ErrTooLarge       = errors.New("emoji file too large")
	ErrInvalidType    = errors.New("only PNG, GIF, WebP, or JPEG allowed")
	ErrInvalidName    = errors.New("emoji name must be 2-32 characters, letters/digits/underscore only")
	ErrNameTaken      = errors.New("an emoji with that name already exists in this server")
	ErrLimitReached   = errors.New("this server has reached its emoji limit")
	ErrInvalidAspect  = errors.New("emoji must be roughly square")
	ErrInvalidSize    = errors.New("emoji dimensions out of bounds")
	ErrEmojiNotFound  = errors.New("emoji not found")
	ErrGuildNotFound  = errors.New("guild not found")
)