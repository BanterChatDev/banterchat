package bots

import (
	"errors"
	"strconv"

	"github.com/labstack/echo/v4"

	"ror/modules/messages"
	"ror/modules/reactions"
)

const (
	ErrCodeUnknownApp     = 10001
	ErrCodeInvalidToken   = 10002
	ErrCodeUnauthorized   = 10003
	ErrCodeInvalidName       = 20001
	ErrCodeInvalidDesc       = 20002
	ErrCodeMaxAppsReached    = 20003
	ErrCodeNameTaken         = 20004
	ErrCodeDuplicateCommand  = 20005

	ErrCodeForbidden      = 50001
	ErrCodeMissingPerms   = 50013
	ErrCodeNotGuildMember = 50025

	ErrCodeRateLimited    = 42900
	ErrCodeServerError    = 50500
	ErrCodeInvalidRequest = 40001
)

var (
	ErrNotFound     = errors.New("application not found")
	ErrNotOwner     = errors.New("not the application owner")
	ErrMaxApps      = errors.New("maximum applications reached")
	ErrInvalidName  = errors.New("invalid application name")
	ErrInvalidDesc  = errors.New("description too long")
	ErrInvalidToken = errors.New("invalid token")
)

type invalidNameErr struct{ detail string }

func (e *invalidNameErr) Error() string { return e.detail }
func (e *invalidNameErr) Is(target error) bool { return target == ErrInvalidName }

func wrapInvalidName(detail string) error {
	if detail == "" {
		return ErrInvalidName
	}
	return &invalidNameErr{detail: detail}
}

type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func writeAppErr(c echo.Context, err error) error {
	switch {
	case errors.Is(err, ErrNotFound), errors.Is(err, ErrNotOwner):
		return c.JSON(404, ErrorResponse{Code: ErrCodeUnknownApp, Message: "application not found"})
	case errors.Is(err, ErrInvalidName):
		msg := err.Error()
		if msg == ErrInvalidName.Error() {
			msg = "invalid application name"
		}
		return c.JSON(400, ErrorResponse{Code: ErrCodeInvalidName, Message: msg})
	case errors.Is(err, ErrInvalidDesc):
		return c.JSON(400, ErrorResponse{Code: ErrCodeInvalidDesc, Message: "description too long (max 400 chars)"})
	case errors.Is(err, ErrMaxApps):
		return c.JSON(400, ErrorResponse{Code: ErrCodeMaxAppsReached, Message: "maximum applications reached"})
	default:
		return c.JSON(500, ErrorResponse{Code: ErrCodeServerError, Message: "server error"})
	}
}

func badReq(c echo.Context) error {
	return c.JSON(400, ErrorResponse{Code: ErrCodeInvalidRequest, Message: "invalid request body"})
}

func serverErr(c echo.Context, msg string) error {
	if msg == "" {
		msg = "server error"
	}
	return c.JSON(500, ErrorResponse{Code: ErrCodeServerError, Message: msg})
}

// WriteMessageError handles the messages/reactions error vocabulary —
// the set of errors that messages.Send and reactions.Add/Remove return.
// Both the bot HTTP layer (mapActionError) and the interactions HTTP
// layer (mapError) need to map these to the same {code, message} wire
// shape. Returns true if the error was recognized and a response was
// written; false if the caller should fall through to its own handling.
//
// Keep this list in sync with messages/errors.go and reactions/errors.go.
func WriteMessageError(c echo.Context, err error) bool {
	if b, ok := err.(*messages.SendBlockedErr); ok {
		c.JSON(403, ErrorResponse{Code: ErrCodeForbidden, Message: b.Reason})
		return true
	}
	if sl, ok := err.(*messages.SlowmodeErr); ok {
		c.Response().Header().Set("Retry-After", strconv.Itoa(sl.RetryAfter))
		c.JSON(429, ErrorResponse{Code: ErrCodeForbidden, Message: "slowmode"})
		return true
	}
	switch err {
	case messages.ErrNotFound:
		c.JSON(404, ErrorResponse{Code: ErrCodeUnknownApp, Message: "not found"})
		return true
	case messages.ErrNotAllowed, reactions.ErrNotAllowed:
		c.JSON(403, ErrorResponse{Code: ErrCodeForbidden, Message: "missing permissions"})
		return true
	case messages.ErrInvalidRequest, messages.ErrEmptyContent, messages.ErrTooLong,
		reactions.ErrInvalidRequest, reactions.ErrReactionLimit:
		c.JSON(400, ErrorResponse{Code: ErrCodeInvalidRequest, Message: err.Error()})
		return true
	}
	return false
}