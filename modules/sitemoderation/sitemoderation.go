package sitemoderation

import (
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/db"
	"ror/modules/guilds"
	"ror/modules/permissions"
	"ror/modules/websocket"
)

type Termination struct {
	UserID                string    `json:"user_id"`
	Username              string    `json:"username"`
	AvatarID              string    `json:"avatar_id"`
	TerminatedBy          string    `json:"terminated_by"`
	TerminatedByUsername  string    `json:"terminated_by_username"`
	Reason                string    `json:"reason"`
	CreatedAt             time.Time `json:"created_at"`
}

type Service struct {
	db    *db.DB
	hub   *websocket.Hub
	users interface {
		DecryptUsernameByID(string) string
		DecryptUsernameByIDRaw(string) string
		IsSiteAdmin(string) bool
	}
	GetAvatarID        func(userID string) string
	InvalidateBotToken func(botUserID string) error
	BuildUserResponse  func(viewerID, userID string) (echo.Map, error)
}

func NewService(db *db.DB, hub *websocket.Hub, users interface {
	DecryptUsernameByID(string) string
	DecryptUsernameByIDRaw(string) string
	IsSiteAdmin(string) bool
}) *Service {
	return &Service{db: db, hub: hub, users: users}
}

func (s *Service) IsIPBanned(ip string) bool {
	return s.db.IsIPBanned(ip)
}

func (s *Service) IsBanned(userID string) bool {
	return s.db.IsUserBanned(userID)
}

func (s *Service) ExecTerminate(targetID, actorID, reason string) error {
	if targetID == actorID {
		return ErrCannotTerminateSelf
	}
	if s.users.IsSiteAdmin(targetID) {
		return ErrCannotTerminateSiteAdmin
	}
	affectedGuilds, _ := s.db.ListGuildIDsForUser(targetID)
	if err := s.db.InsertBan(targetID, actorID, reason); err != nil {
		return ErrServerError
	}
	if lastIP := s.db.GetUserLastIP(targetID); lastIP != "" {
		s.db.InsertIPBan(lastIP, targetID)
	}
	s.db.DeleteGuildMembersByUser(targetID)
	s.db.DeleteSessionsByUser(targetID)
	if s.InvalidateBotToken != nil {
		_ = s.InvalidateBotToken(targetID)
	}
	permissions.InvalidatePermCache(targetID)
	username := s.users.DecryptUsernameByIDRaw(targetID)
	actorUsername := s.users.DecryptUsernameByIDRaw(actorID)
	s.emitUserTerminated(targetID, reason, actorID, actorUsername)
	s.emitUserTerminate(targetID, username)
	for _, gid := range affectedGuilds {
		guilds.EmitMemberRemove(s.hub, gid, targetID)
	}
	s.emitAdminUserTerminate(targetID, username, reason, actorID)
	s.emitUserMaskedUpdate(targetID)
	go func(uid string) {
		time.Sleep(200 * time.Millisecond)
		s.hub.BanDisconnect(uid)
	}(targetID)
	return nil
}

func (s *Service) ExecRestore(targetID string) error {
	s.db.DeleteIPBansByUser(targetID)
	s.db.DeleteBansByUser(targetID)
	permissions.InvalidatePermCache(targetID)
	username := s.users.DecryptUsernameByIDRaw(targetID)
	s.emitUserRestore(targetID, username)
	s.emitAdminUserRestore(targetID, username)
	s.emitUserUnmaskedUpdate(targetID)
	return nil
}

func (s *Service) TerminateUser(c echo.Context) error {
	actorID := c.Get("userID").(string)
	if !s.users.IsSiteAdmin(actorID) {
		return c.JSON(403, echo.Map{"error": "only site admins can terminate users"})
	}
	targetID := c.Param("id")
	var req struct {
		Reason string `json:"reason"`
	}
	c.Bind(&req)
	if err := s.ExecTerminate(targetID, actorID, req.Reason); err != nil {
		if err == ErrCannotTerminateSelf || err == ErrCannotTerminateSiteAdmin {
			return c.JSON(403, echo.Map{"error": err.Error()})
		}
		return c.JSON(500, echo.Map{"error": err.Error()})
	}
	return c.JSON(200, echo.Map{"message": "user terminated"})
}

func (s *Service) RestoreUser(c echo.Context) error {
	actorID := c.Get("userID").(string)
	if !s.users.IsSiteAdmin(actorID) {
		return c.JSON(403, echo.Map{"error": "only site admins can restore users"})
	}
	s.ExecRestore(c.Param("id"))
	return c.JSON(200, echo.Map{"message": "user restored"})
}

func (s *Service) ListTerminations(c echo.Context) error {
	actorID := c.Get("userID").(string)
	if !s.users.IsSiteAdmin(actorID) {
		return c.JSON(403, echo.Map{"error": "only site admins can view the termination list"})
	}
	limit := parseIntParam(c.QueryParam("limit"), 50, 1, 200)
	offset := parseIntParam(c.QueryParam("offset"), 0, 0, 1<<30)
	q := strings.ToLower(strings.TrimSpace(c.QueryParam("search")))

	dbRows, err := s.db.ListBans()
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	actorNameCache := make(map[string]string)
	all := make([]Termination, 0, len(dbRows))
	for _, r := range dbRows {
		avatarID := ""
		if s.GetAvatarID != nil {
			avatarID = s.GetAvatarID(r.UserID)
		}
		actorName, ok := actorNameCache[r.BannedBy]
		if !ok {
			actorName = s.users.DecryptUsernameByIDRaw(r.BannedBy)
			actorNameCache[r.BannedBy] = actorName
		}
		b := Termination{
			UserID:               r.UserID,
			Username:             s.users.DecryptUsernameByIDRaw(r.UserID),
			AvatarID:             avatarID,
			TerminatedBy:         r.BannedBy,
			TerminatedByUsername: actorName,
			Reason:               r.Reason,
			CreatedAt:            r.CreatedAt,
		}
		if q != "" {
			hay := strings.ToLower(b.Username + " " + b.UserID + " " + b.Reason + " " + b.TerminatedByUsername)
			if !strings.Contains(hay, q) {
				continue
			}
		}
		all = append(all, b)
	}
	total := len(all)
	if offset > total {
		offset = total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return c.JSON(200, echo.Map{
		"terminations": all[offset:end],
		"total":        total,
		"offset":       offset,
		"limit":        limit,
	})
}

func parseIntParam(s string, def, min, max int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}
