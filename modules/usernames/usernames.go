package usernames

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var (
	ErrUsernameSpaces   = errors.New("username cannot contain spaces")
	ErrUsernameReserved = errors.New("that username is reserved")
	ErrUsernameChars    = errors.New("username can only contain lowercase letters, numbers, and underscores")
	ErrBotNameChars     = errors.New("bot name can only contain letters, numbers, and underscores")
)

var usernameAllowed = regexp.MustCompile(`^[a-z0-9_]+$`)
var botNameAllowed = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

func Sanitize(input string) string {
	return strings.TrimSpace(strings.ToLower(input))
}

func IsBlacklisted(name string, blacklist []string) bool {
	n := strings.ToLower(strings.TrimSpace(name))
	for _, banned := range blacklist {
		if n == banned {
			return true
		}
	}
	return false
}

func Validate(name string, minLen, maxLen int, blacklist []string) error {
	if len(name) < minLen || len(name) > maxLen {
		return fmt.Errorf("username must be %d-%d characters", minLen, maxLen)
	}
	if !usernameAllowed.MatchString(name) {
		return ErrUsernameChars
	}
	if IsBlacklisted(name, blacklist) {
		return ErrUsernameReserved
	}
	return nil
}

func ValidateBot(name string, minLen, maxLen int, blacklist []string) error {
	if len(name) < minLen || len(name) > maxLen {
		return fmt.Errorf("bot name must be %d-%d characters", minLen, maxLen)
	}
	if !botNameAllowed.MatchString(name) {
		return ErrBotNameChars
	}
	if IsBlacklisted(name, blacklist) {
		return ErrUsernameReserved
	}
	return nil
}