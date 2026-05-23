package auth

import (
	"github.com/labstack/echo/v4"
	"ror/modules/keyfile"
)

func (s *Service) KeyfileHandlers() *keyfile.Handlers {
	return keyfile.NewHandlers(keyfile.HandlerDeps{
		DB:                s.db,
		KeyfileSvc:        s.keyfile,
		Audit:             s.audit,
		MasterKey:         s.authCfg.MasterKey,
		HashIP:            s.hashIP,
		UpdateLastLoginIP: s.users.UpdateLastLoginIP,
		SetSession:        s.setSession,
		EmitSessionChange: s.emitSessionChange,
		NukeOtherSessions: s.nukeOtherSessionsCtx,
		NukeAllSessions:   s.nukeAllSessions,
		ValidatePassword:  func(pw string) error { return ValidatePassword(pw, s.authCfg) },
		GetUserByID:       s.keyfileGetUserByID,
		GetUserByUsername: s.keyfileGetUserByUsername,
		DecryptUsername:   s.keyfileDecryptUsername,
	})
}

func (s *Service) nukeOtherSessionsCtx(c echo.Context, userID string) {
	sid, _ := c.Get("sessionID").(string)
	s.nukeOtherSessions(userID, sid)
}

func (s *Service) keyfileGetUserByID(userID string) (*keyfile.UserRef, error) {
	u, err := s.users.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	return &keyfile.UserRef{ID: u.ID, PasswordHash: u.PasswordHash, LastLoginIP: u.LastLoginIP, EncUsername: u.Username}, nil
}

func (s *Service) keyfileGetUserByUsername(usernameHash string) (*keyfile.UserRef, error) {
	u, err := s.users.GetUserByUsername(usernameHash)
	if err != nil {
		return nil, err
	}
	return &keyfile.UserRef{ID: u.ID, PasswordHash: u.PasswordHash, LastLoginIP: u.LastLoginIP, EncUsername: u.Username}, nil
}

func (s *Service) keyfileDecryptUsername(u *keyfile.UserRef) string {
	if u == nil {
		return ""
	}
	return s.users.DecryptUsernameByID(u.ID)
}