package bots

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/labstack/echo/v4"

	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/ratelimit"
)

func (s *Service) extractBotToken(header string) string {
	if !strings.HasPrefix(header, "Bot ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(header, "Bot "))
}

func (s *Service) TryBotAuth(c echo.Context) (userID string, appID string, ok bool) {
	token := s.extractBotToken(c.Request().Header.Get("Authorization"))
	if token == "" {
		return "", "", false
	}
	app, err := s.LookupByToken(token)
	if err != nil || app == nil {
		return "", "", false
	}
	return app.BotUserID, app.ID, true
}

// RequireBot enforces that the request carries a valid bot token.
// Rejects with 401 otherwise. Unlike the old RequireBotOrSession shim,
// this NEVER falls back to session auth — bot routes live under
// /api/v1/bot/* with their own dedicated handler funcs, so mixing
// humans onto them is a bug, not a supported case.
//
// On success, sets context keys:
//   userID → the bot user's ID (the paired user row, not the app)
//   appID  → the application ID
//   isBot  → true (consumed by ratelimit / audit middleware)
func (s *Service) RequireBot() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userID, appID, ok := s.TryBotAuth(c)
			if !ok {
				return c.JSON(401, ErrorResponse{
					Code:    ErrCodeUnauthorized,
					Message: "bot token required",
				})
			}
			c.Set("userID", userID)
			c.Set("appID", appID)
			c.Set("isBot", true)
			return next(c)
		}
	}
}

func (s *Service) pickBucket(method, path string) (string, int, int) {
	if strings.Contains(path, "/reactions/") || strings.HasSuffix(path, "/typing") {
		return "interact", s.cfg.InteractRate, s.cfg.InteractBurst
	}
	if method == "GET" {
		return "read", s.cfg.ReadRate, s.cfg.ReadBurst
	}
	if method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE" {
		if strings.Contains(path, "/messages") {
			return "msg", s.cfg.MsgRate, s.cfg.MsgBurst
		}
		if strings.Contains(path, "/members/") {
			return "members", s.cfg.MembersRate, s.cfg.MembersBurst
		}
		if strings.Contains(path, "/roles") {
			return "roles", s.cfg.RolesRate, s.cfg.RolesBurst
		}
		if strings.Contains(path, "/channels") {
			return "channels", s.cfg.ChannelsRate, s.cfg.ChannelsBurst
		}
		return "msg", s.cfg.MsgRate, s.cfg.MsgBurst
	}
	return "global", s.cfg.GlobalRate, s.cfg.GlobalBurst
}

func (s *Service) APIMiddleware(limiter *ratelimit.Limiter) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			isBot, _ := c.Get("isBot").(bool)
			if !isBot {
				return next(c)
			}
			botUserID, _ := c.Get("userID").(string)
			method := c.Request().Method
			path := c.Path()
			bucketName, rate, burst := s.pickBucket(method, path)
			ok, retryAfter := limiter.AllowBot(botUserID, bucketName, float64(rate), burst)
			if !ok {
				c.Response().Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", burst))
				c.Response().Header().Set("X-RateLimit-Remaining", "0")
				c.Response().Header().Set("X-RateLimit-Reset-After", fmt.Sprintf("%.3f", retryAfter))
				c.Response().Header().Set("X-RateLimit-Bucket", bucketName)
				return c.JSON(429, ErrorResponse{Code: ErrCodeRateLimited, Message: "rate limited"})
			}
			err := next(c)
			go s.writeAudit(botUserID, method+" "+path, c.Param("guildId"), c.Response().Status)
			return err
		}
	}
}

func (s *Service) writeAudit(botUserID, route, guildID string, status int) {
	if botUserID == "" {
		return
	}
	_ = s.db.InsertBotAudit(id.Generate(), botUserID, route, guildID, status)
}

// DedupCommandsMiddleware inspects the registration payload BEFORE
// any database work happens. If two commands share a name it:
//   1. rejects the request with 400 + ErrCodeDuplicateCommand
//   2. kicks the bot's gateway connection (close 4010) so the bot's
//      reconnect loop sees a terminal error and the author actually
//      notices, instead of the bot quietly retrying forever
//
// The request body is read once, parsed, then re-attached to
// c.Request().Body so the downstream handler's c.Bind can still
// consume it. On any I/O or parse error we fall through to next() —
// the handler will produce its own 400 from c.Bind, which keeps the
// failure mode owned by one place.
func (s *Service) DedupCommandsMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := io.ReadAll(c.Request().Body)
			if err != nil {
				return next(c)
			}
			c.Request().Body = io.NopCloser(bytes.NewReader(raw))
			var probe struct {
				Commands []struct {
					Name string `json:"name"`
				} `json:"commands"`
			}
			if err := json.Unmarshal(raw, &probe); err != nil {
				return next(c)
			}
			seen := make(map[string]struct{}, len(probe.Commands))
			for _, cmd := range probe.Commands {
				if cmd.Name == "" {
					continue
				}
				if _, dup := seen[cmd.Name]; dup {
					botUserID, _ := c.Get("userID").(string)
					logger.Warn("bots: rejecting duplicate command and kicking gateway",
						"bot_user_id", botUserID, "command", cmd.Name)
					if s.hub != nil && botUserID != "" {
						s.hub.KickBotProtocolViolation(botUserID,
							"duplicate command name in registration: "+cmd.Name)
					}
					return c.JSON(400, ErrorResponse{
						Code:    ErrCodeDuplicateCommand,
						Message: "duplicate command name in payload: " + cmd.Name,
					})
				}
				seen[cmd.Name] = struct{}{}
			}
			return next(c)
		}
	}
}