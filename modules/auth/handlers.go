package auth

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"ror/modules/auditlog"
	"ror/modules/encryption"
	"ror/modules/keyfile"
	"ror/modules/logger"
	"ror/modules/usernames"
)

func (s *Service) Register(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		B        string `json:"_b"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if s.IsIPBanned != nil && s.IsIPBanned(c.RealIP()) {
		return c.JSON(403, echo.Map{"error": ErrBanned.Error()})
	}
	if isBotUA(c.Request().UserAgent()) || !checkBrowserProof(req.B) {
		return c.JSON(403, echo.Map{"error": ErrBotDetected.Error()})
	}
	req.Username = usernames.Sanitize(req.Username)
	if s.rateLimitEnabled && s.authCfg.MaxRegistrationsPerIP > 0 {
		if s.countRecentRegistrations(c.RealIP()) >= s.authCfg.MaxRegistrationsPerIP {
			return c.JSON(429, echo.Map{"error": ErrTooManyRegistrations.Error()})
		}
	}
	if err := usernames.Validate(req.Username, s.authCfg.MinUsername, s.authCfg.MaxUsername, s.blacklist); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if err := ValidatePassword(req.Password, s.authCfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrHashFailed.Error()})
	}
	userKey := encryption.GenerateKey()
	encUserKey, err := encryption.EncryptUserKey(userKey, s.authCfg.MasterKey)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	usernameHash := encryption.HashIdentifier(req.Username, s.authCfg.MasterKey)
	encUsername, err := encryption.Encrypt(req.Username, userKey)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if s.users.IsUsernameReserved(usernameHash) {
		return c.JSON(409, echo.Map{"error": ErrUsernameTaken.Error()})
	}
	user, err := s.users.CreateUser(encUsername, usernameHash, string(hash), encUserKey, s.hashIP(c.RealIP()))
	if err != nil {
		errLower := strings.ToLower(err.Error())
		if strings.Contains(errLower, "unique") || strings.Contains(errLower, "duplicate") {
			return c.JSON(409, echo.Map{"error": ErrUsernameTaken.Error()})
		}
		logger.Error("register: create user failed", "error", err)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if admins, _ := s.db.ListSiteAdmins(); len(admins) == 0 {
		if err := s.db.AddSiteAdmin(user.ID, "", "first user bootstrap"); err != nil {
			logger.Error("bootstrap admin failed", "error", err)
		}
	}
	s.logRegistration(c.RealIP())
	s.setSession(c, user.ID)
	plainUsername := s.users.DecryptUsername(user)
	resp := echo.Map{
		"id": user.ID, "username": plainUsername,
	}
	return c.JSON(201, resp)
}

func (s *Service) Login(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	req.Username = usernames.Sanitize(req.Username)
	usernameHash := encryption.HashIdentifier(req.Username, s.authCfg.MasterKey)
	user, err := s.users.GetUserByUsername(usernameHash)
	if err != nil {
		return c.JSON(401, echo.Map{"error": ErrInvalidCredentials.Error()})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		return c.JSON(401, echo.Map{"error": ErrInvalidCredentials.Error()})
	}
	if s.IsBanned != nil && s.IsBanned(user.ID) {
		resp := echo.Map{"error": ErrBanned.Error(), "kind": "banned"}
		if b := s.db.GetUserBan(user.ID); b != nil {
			resp["reason"] = b.Reason
			resp["banned_by_username"] = s.users.DecryptUsernameByID(b.BannedBy)
			resp["created_at"] = b.CreatedAt.UTC().Format(time.RFC3339)
		}
		return c.JSON(403, resp)
	}
	if s.IsSuspended != nil && s.IsSuspended(user.ID) {
		resp := echo.Map{"error": ErrSuspended.Error(), "kind": "suspended"}
		if info, ok := s.db.GetSuspension(user.ID); ok {
			resp["reason"] = info.Reason
			if info.Until != nil {
				resp["until"] = info.Until.UTC().Format(time.RFC3339)
			}
		}
		return c.JSON(403, resp)
	}
	if s.IsIPBanned != nil && s.IsIPBanned(c.RealIP()) {
		return c.JSON(403, echo.Map{"error": ErrBanned.Error()})
	}
	currentIPHash := s.hashIP(c.RealIP())
	storedIPHash := user.LastLoginIP
	hasKeyfile := s.db.GetUserKeyfileHash(user.ID) != ""
	if hasKeyfile && currentIPHash != storedIPHash && storedIPHash != "" {
		return c.JSON(202, echo.Map{
			"requires_keyfile": true,
			"username":         req.Username,
			"message":          "Upload your keyfile to verify this device",
		})
	}
	s.users.UpdateLastLoginIP(user.ID, s.hashIP(c.RealIP()))
	s.setSession(c, user.ID)
	s.emitSessionChange(user.ID)
	plainUsername := s.users.DecryptUsername(user)
	resp := echo.Map{
		"id": user.ID, "username": plainUsername,
	}
	return c.JSON(200, resp)
}

func (s *Service) ChangePassword(c echo.Context) error {
	userID := c.Get("userID").(string)
	sessionID, _ := c.Get("sessionID").(string)
	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
		Keyfile     string `json:"keyfile"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if req.OldPassword == "" {
		return c.JSON(400, echo.Map{"error": keyfile.ErrPasswordRequired.Error()})
	}
	user, err := s.users.GetUserByID(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)) != nil {
		return c.JSON(403, echo.Map{"error": keyfile.ErrPasswordWrong.Error()})
	}
	storedKeyfileHash := s.db.GetUserKeyfileHash(userID)
	if storedKeyfileHash != "" {
		keyfileBytes, ok := keyfile.Decode(req.Keyfile)
		if !ok || !keyfile.Verify(keyfileBytes, storedKeyfileHash) {
			return c.JSON(403, echo.Map{"error": keyfile.ErrWrongKeyfile.Error()})
		}
	}
	if err := ValidatePassword(req.NewPassword, s.authCfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	pwHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrHashFailed.Error()})
	}
	if err := s.db.UpdateUserPassword(userID, string(pwHash)); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.nukeOtherSessions(userID, sessionID)
	s.audit.Record(userID, auditlog.TargetUser, userID, auditlog.ActionUserPasswordChange, "", map[string]any{
		"ip_hash":    s.hashIP(c.RealIP()),
		"user_agent": c.Request().UserAgent(),
	}, "", false)
	return c.JSON(200, echo.Map{"message": "password changed"})
}

func (s *Service) Logout(c echo.Context) error {
	cookie, _ := c.Cookie(SessionCookieName)
	if cookie != nil {
		sess, err := s.getSession(cookie.Value)
		if err == nil && sess != nil {
			s.hub.DisconnectUser(sess.UserID)
		}
		s.db.DeleteSession(cookie.Value)
	}
	c.SetCookie(&http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		Domain:   cookieDomain(s.domain),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
	})
	return c.JSON(200, echo.Map{"message": "logged out"})
}

func (s *Service) ListSessions(c echo.Context) error {
	userID := c.Get("userID").(string)
	currentCookie, _ := c.Cookie(SessionCookieName)
	sessions, err := s.getUserSessions(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	result := make([]echo.Map, len(sessions))
	for i, sess := range sessions {
		result[i] = echo.Map{
			"id":         sess.ID,
			"ip":         sess.IP,
			"user_agent": sess.UserAgent,
			"expires_at": sess.ExpiresAt,
			"created_at": sess.CreatedAt,
			"current":    currentCookie != nil && currentCookie.Value == sess.ID,
		}
	}
	return c.JSON(200, result)
}

func (s *Service) RevokeSession(c echo.Context) error {
	userID := c.Get("userID").(string)
	sessionID := c.Param("id")
	currentCookie, _ := c.Cookie(SessionCookieName)
	sessions, err := s.getUserSessions(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	var target *Session
	for i, sess := range sessions {
		if sess.ID == sessionID {
			if sess.UserID != userID {
				return c.JSON(403, echo.Map{"error": ErrUnauthorized.Error()})
			}
			target = &sessions[i]
			break
		}
	}
	if target == nil {
		return c.JSON(404, echo.Map{"error": ErrSessionNotFound.Error()})
	}
	if currentCookie != nil && currentCookie.Value == target.ID {
		return c.JSON(400, echo.Map{"error": ErrCannotRevokeSelf.Error()})
	}
	s.db.DeleteSession(target.ID)
	s.hub.DisconnectSession(target.ID)
	s.emitSessionChange(userID)
	s.audit.Record(userID, auditlog.TargetUser, userID, auditlog.ActionUserSessionRevoke, "", map[string]any{
		"revoked_session_prefix": target.ID[:8],
		"user_agent":             target.UserAgent,
		"ip_hash":                target.IP,
	}, "", false)
	return c.JSON(200, echo.Map{"message": "session revoked"})
}