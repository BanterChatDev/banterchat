package discovery

import "errors"

var (
	ErrNotFound       = errors.New("listing not found")
	ErrSlugTaken      = errors.New("slug is already taken")
	ErrSlugInvalid    = errors.New("slug must be 3-32 chars, lowercase letters, digits, or hyphens")
	ErrInviteRequired = errors.New("an invite must be selected before publishing")
	ErrInviteInvalid  = errors.New("invite code is not valid for this guild")
	ErrBumpCooldown   = errors.New("bump on cooldown")
	ErrForbidden      = errors.New("not authorised")
	ErrRatingInvalid  = errors.New("rating must be between 1 and 5 stars")
)