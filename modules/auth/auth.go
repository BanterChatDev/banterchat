package auth

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/apperr"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/keyfile"
	"ror/modules/permissions"
	"ror/modules/users"
	"ror/modules/websocket"
)

const (
	SessionCookieName = "ror_session"
	SessionDuration   = 7 * 24 * time.Hour
)

func cookieDomain(rawDomain string) string {
	d := strings.TrimSpace(rawDomain)
	if d == "" || d == "localhost" || !strings.Contains(d, ".") {
		return ""
	}
	if strings.HasPrefix(d, ".") {
		return d
	}
	return "." + d
}

type Service struct {
	db               *db.DB
	authCfg          Config
	domain           string
	secure           bool
	blacklist        []string
	rateLimitEnabled bool
	hub              *websocket.Hub
	users            *users.Service
	keyfile          *keyfile.Service
	audit            *auditlog.Service
	IsBanned         func(userID string) bool
	IsIPBanned       func(ip string) bool
	IsSuspended      func(userID string) bool
}

func NewService(db *db.DB, authCfg Config, domain string, secure bool, blacklist []string, rateLimitEnabled bool, hub *websocket.Hub, usersSvc *users.Service, keyfileSvc *keyfile.Service, auditSvc *auditlog.Service) *Service {
	svc := &Service{
		db:               db,
		authCfg:          authCfg,
		domain:           domain,
		secure:           secure,
		blacklist:        blacklist,
		rateLimitEnabled: rateLimitEnabled,
		hub:              hub,
		users:            usersSvc,
		keyfile:          keyfileSvc,
		audit:            auditSvc,
	}

	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			svc.cleanExpiredSessions()
		}
	}()

	return svc
}

func (s *Service) hashIP(ip string) string {
	return encryption.HashIdentifier(ip, s.authCfg.MasterKey)
}

func (s *Service) setSession(c echo.Context, userID string) {
	sess, err := s.createSession(userID, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return
	}

	s.clearHostOnlySession(c)

	c.SetCookie(&http.Cookie{
		Name:     SessionCookieName,
		Value:    sess.ID,
		Path:     "/",
		Domain:   cookieDomain(s.domain),
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(SessionDuration.Seconds()),
	})
}

// LookupSessionUserID returns the user ID for a session ID if the session
// exists and is not expired. Empty string otherwise. Used by handlers that
// need best-effort auth awareness without enforcing the middleware.
func (s *Service) LookupSessionUserID(sessionID string) string {
	if sessionID == "" {
		return ""
	}
	sess, err := s.getSession(sessionID)
	if err != nil {
		return ""
	}
	return sess.UserID
}

// SessionUserID reads the session cookie from the request and returns the
// associated user ID, or empty string if the request is unauthenticated or
// the session is invalid. Use this in handlers that need best-effort auth
// awareness without enforcing the RequireAuth middleware (e.g. pages that
// render differently for logged-in vs anonymous visitors, public-facing
// endpoints with different behavior per auth state).
func (s *Service) SessionUserID(c echo.Context) string {
	cookie, err := c.Cookie(SessionCookieName)
	if err != nil || cookie.Value == "" {
		return ""
	}
	return s.LookupSessionUserID(cookie.Value)
}

func (s *Service) clearHostOnlySession(c echo.Context) {
	c.SetCookie(&http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (s *Service) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		cookie, err := c.Cookie(SessionCookieName)
		if err != nil || cookie.Value == "" {
			return c.JSON(401, echo.Map{"error": ErrUnauthorized.Error()})
		}

		sess, err := s.getSession(cookie.Value)
		if err != nil {
			s.clearHostOnlySession(c)
			return c.JSON(401, echo.Map{"error": ErrSessionExpired.Error()})
		}

		if s.IsBanned != nil && s.IsBanned(sess.UserID) {
			s.db.DeleteSession(cookie.Value)
			return c.JSON(403, echo.Map{"error": ErrBanned.Error()})
		}
		if s.IsSuspended != nil && s.IsSuspended(sess.UserID) {
			s.db.DeleteSession(cookie.Value)
			return c.JSON(403, echo.Map{"error": ErrSuspended.Error()})
		}
		c.Set("userID", sess.UserID)
		c.Set("sessionID", sess.ID)
		return next(c)
	}
}

func (s *Service) RequireSiteAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, _ := c.Get("userID").(string)
		if userID == "" || !s.users.IsSiteAdmin(userID) {
			return apperr.NotFound(c)
		}
		return next(c)
	}
}

// RequirePerm enforces a per-guild permission check. Route must expose the
// guild via :guildId URL param, or :id where :id is a channel (guild is
// resolved via channel→guild lookup).
//
// Checks in order:
//   1. User is a member of the guild (403 if not)
//   2. User is the owner of the guild (passes all perms)
//   3. User's effective guild perms include the Administrator bit
//   4. User's effective guild perms include the requested bit
//
// There is no global-perm fallback. If the route doesn't expose a guild
// the middleware cannot resolve, the middleware rejects the request — use
// RequireAuth-only routes when the endpoint is truly not guild-scoped.
func (s *Service) RequirePerm(perm int64) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userID, ok := c.Get("userID").(string)
			if !ok || userID == "" {
				return c.JSON(401, echo.Map{"error": ErrUnauthorized.Error()})
			}
			guildID := s.resolvePermGuildID(c)
			if guildID == "" {
				// No guild context on a perm-gated route — refuse. Previously
				// fell back to user.roles global perms; that system is gone.
				return c.JSON(403, echo.Map{"error": ErrInsufficientPerms.Error()})
			}
			if !s.db.IsGuildMember(guildID, userID) {
				return c.JSON(403, echo.Map{"error": ErrInsufficientPerms.Error()})
			}
			// Owner bypass — guild owner always passes perm checks in their guild.
			if g, err := s.db.GetGuild(guildID); err == nil && g.OwnerID == userID {
				c.Set("userPerms", int64(-1))
				c.Set("permGuildID", guildID)
				return next(c)
			}
			perms := permissions.GetUserGuildPerms(s.db, userID, guildID)
			if !permissions.HasPerm(perms, perm) {
				return c.JSON(403, echo.Map{"error": ErrInsufficientPerms.Error()})
			}
			c.Set("userPerms", perms)
			c.Set("permGuildID", guildID)
			return next(c)
		}
	}
}

func (s *Service) resolvePermGuildID(c echo.Context) string {
	if gid := c.Param("guildId"); gid != "" {
		return gid
	}
	// :id route — could be a channel, category, or role depending on the
	// route. Probe each until one resolves. Empty result from any of them
	// means "not that kind of entity" — move on.
	if id := c.Param("id"); id != "" {
		if gid := s.db.GetChannelGuildID(id); gid != "" {
			return gid
		}
		if gid := s.db.GetCategoryGuildID(id); gid != "" {
			return gid
		}
		if gid := s.db.GetRoleGuildID(id); gid != "" {
			return gid
		}
		if gid := s.db.GetWebhookGuildID(id); gid != "" {
			return gid
		}
	}
	if chID := c.Param("channelId"); chID != "" {
		if gid := s.db.GetChannelGuildID(chID); gid != "" {
			return gid
		}
	}
	return ""
}