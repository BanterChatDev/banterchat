package keyfile

import "errors"

var (
	ErrNotEnabled       = errors.New("keyfile not enabled")
	ErrInvalid          = errors.New("invalid keyfile")
	ErrNoKeyfileSet     = errors.New("no keyfile set on this account")
	ErrAlreadySet       = errors.New("keyfile already set; rotate or remove first")
	ErrPasswordRequired = errors.New("current password is required")
	ErrPasswordWrong    = errors.New("current password is incorrect")
	ErrWrongKeyfile     = errors.New("keyfile does not match")
)