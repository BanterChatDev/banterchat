package guilds

import (
	"errors"
	"ror/modules/apperr"
)

const (
	errFmtNameTooShort = "guild name must be at least %d characters"
	errFmtNameTooLong  = "guild name must be at most %d characters"
)

var (
	ErrNotAllowed        = apperr.ErrNotAllowed
	ErrInvalidRequest    = apperr.ErrInvalidRequest
	ErrServerError       = apperr.ErrServerError
	ErrGuildNotFound     = errors.New("guild not found")
	ErrNotMember         = errors.New("you are not a member of this guild")
	ErrNotOwner          = errors.New("only the guild owner can do this")
	ErrCannotLeaveAsOwner = errors.New("transfer ownership before leaving")
	ErrCannotBanSelf      = errors.New("cannot ban yourself")
	ErrCannotBanSiteAdmin = errors.New("cannot ban a site admin")
	ErrCannotBanOwner     = errors.New("cannot ban the guild owner")
	ErrCannotKickOwner    = errors.New("cannot kick the guild owner")
	ErrNotAMember         = errors.New("user is not a member of this guild")
)