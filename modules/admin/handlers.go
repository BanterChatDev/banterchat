package admin

import (
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/users"
)

func (s *Service) Stats(c echo.Context) error {
	return c.JSON(200, s.statsSnapshot())
}

func (s *Service) ListUsers(c echo.Context) error {
	limit := parseInt(c.QueryParam("limit"), 50, 1, 200)
	offset := parseInt(c.QueryParam("offset"), 0, 0, 1<<30)
	q := c.QueryParam("search")
	includeBanned := c.QueryParam("include_banned") == "1"
	sortMode := c.QueryParam("sort")
	filterMode := c.QueryParam("filter")
	items, total, err := s.listUsersPage(limit, offset, q, includeBanned, sortMode, filterMode)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"users": items, "total": total, "offset": offset, "limit": limit})
}

func (s *Service) ListGuilds(c echo.Context) error {
	limit := parseInt(c.QueryParam("limit"), 50, 1, 200)
	offset := parseInt(c.QueryParam("offset"), 0, 0, 1<<30)
	q := c.QueryParam("search")
	sortMode := c.QueryParam("sort")
	filterMode := c.QueryParam("filter")
	items, total, err := s.listGuildsPage(limit, offset, q, sortMode, filterMode)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"guilds": items, "total": total, "offset": offset, "limit": limit})
}

func (s *Service) GuildDetail(c echo.Context) error {
	view, err := s.guildDetailView(c.Param("guildId"), c.Get("userID").(string))
	if err != nil {
		return c.JSON(404, echo.Map{"error": err.Error()})
	}
	return c.JSON(200, view)
}

func (s *Service) TerminateGuild(c echo.Context) error {
	guildID := c.Param("guildId")
	actorID := c.Get("userID").(string)
	row, err := s.db.GetGuild(guildID)
	if err != nil || row == nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	if err := s.guilds.ExecDelete(guildID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrTerminateFailed.Error()})
	}
	s.emitGuildTerminate(guildID, actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetGuild, guildID, auditlog.ActionGuildTerminate, "", nil)
	}
	return c.JSON(200, echo.Map{"guild_id": guildID, "status": "terminated"})
}

func (s *Service) SuspendUser(c echo.Context) error {
	actorID := c.Get("userID").(string)
	targetID := c.Param("userId")
	if targetID == actorID {
		return c.JSON(400, echo.Map{"error": ErrCannotActOnSelf.Error()})
	}
	if s.users.IsSiteAdmin(targetID) {
		return c.JSON(403, echo.Map{"error": ErrCannotActOnAdmin.Error()})
	}
	var body struct {
		Reason string `json:"reason"`
		Until  string `json:"until"`
	}
	c.Bind(&body)
	var until *time.Time
	if body.Until != "" {
		t, err := time.Parse(time.RFC3339, body.Until)
		if err != nil {
			return c.JSON(400, echo.Map{"error": ErrInvalidUntil.Error()})
		}
		if t.Before(time.Now()) {
			return c.JSON(400, echo.Map{"error": ErrUntilInPast.Error()})
		}
		until = &t
	}
	if err := s.db.SuspendUser(targetID, body.Reason, until); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.db.DeleteSessionsByUser(targetID)
	s.emitUserSuspend(targetID, s.users.DecryptUsernameByID(targetID), body.Reason, until, actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetUser, targetID, auditlog.ActionUserSuspend, body.Reason, map[string]interface{}{"until": body.Until})
	}
	return c.JSON(200, echo.Map{"user_id": targetID, "suspended": true})
}

func (s *Service) UnsuspendUser(c echo.Context) error {
	actorID := c.Get("userID").(string)
	targetID := c.Param("userId")
	if err := s.db.UnsuspendUser(targetID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitUserUnsuspend(targetID, s.users.DecryptUsernameByID(targetID))
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetUser, targetID, auditlog.ActionUserUnsuspend, "", nil)
	}
	return c.JSON(200, echo.Map{"user_id": targetID, "suspended": false})
}

func (s *Service) DeleteUser(c echo.Context) error {
	actorID := c.Get("userID").(string)
	targetID := c.Param("userId")
	if targetID == actorID {
		return c.JSON(400, echo.Map{"error": ErrCannotActOnSelf.Error()})
	}
	if s.users.IsSiteAdmin(targetID) {
		return c.JSON(403, echo.Map{"error": ErrCannotActOnAdmin.Error()})
	}
	row, err := s.users.GetUserByID(targetID)
	if err != nil || row == nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	username := s.users.DecryptUsernameByID(targetID)
	s.db.DeleteSessionsByUser(targetID)
	if err := s.db.DeleteUserByID(targetID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrDeleteFailed.Error()})
	}
	users.InvalidateUserCache(targetID)
	s.emitUserDelete(targetID, username, actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetUser, targetID, auditlog.ActionUserDelete, "", map[string]interface{}{"username": username})
	}
	return c.JSON(200, echo.Map{"user_id": targetID, "deleted": true})
}

func (s *Service) ForceLogoutUser(c echo.Context) error {
	actorID := c.Get("userID").(string)
	targetID := c.Param("userId")
	if targetID == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	s.db.DeleteSessionsByUser(targetID)
	s.emitUserForceLogout(targetID, actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetUser, targetID, auditlog.ActionUserForceLogout, "", nil)
	}
	return c.JSON(200, echo.Map{"user_id": targetID, "logged_out": true})
}

func (s *Service) SuspendGuild(c echo.Context) error {
	actorID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	row, err := s.db.GetGuild(guildID)
	if err != nil || row == nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	var body struct {
		Reason string `json:"reason"`
	}
	c.Bind(&body)
	if err := s.db.SuspendGuild(guildID, body.Reason); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitGuildSuspend(guildID, body.Reason, actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetGuild, guildID, auditlog.ActionGuildSuspend, body.Reason, nil)
	}
	return c.JSON(200, echo.Map{"guild_id": guildID, "suspended": true})
}

func (s *Service) UnsuspendGuild(c echo.Context) error {
	actorID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	if err := s.db.UnsuspendGuild(guildID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitGuildUnsuspend(guildID, actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetGuild, guildID, auditlog.ActionGuildUnsuspend, "", nil)
	}
	return c.JSON(200, echo.Map{"guild_id": guildID, "suspended": false})
}

func (s *Service) PromoteToSiteAdmin(c echo.Context) error {
	actorID := c.Get("userID").(string)
	targetID := c.Param("userId")
	if targetID == actorID {
		return c.JSON(400, echo.Map{"error": ErrCannotActOnSelf.Error()})
	}
	row, err := s.users.GetUserByID(targetID)
	if err != nil || row == nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	if s.users.IsSiteAdmin(targetID) {
		return c.JSON(409, echo.Map{"error": ErrAlreadySiteAdmin.Error()})
	}
	var body struct {
		Note string `json:"note"`
	}
	c.Bind(&body)
	if err := s.db.AddSiteAdmin(targetID, actorID, body.Note); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitUserPromote(targetID, s.users.DecryptUsernameByID(targetID), actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetUser, targetID, auditlog.ActionUserPromote, body.Note, nil)
	}
	return c.JSON(200, echo.Map{"user_id": targetID, "promoted": true})
}

func (s *Service) DemoteFromSiteAdmin(c echo.Context) error {
	actorID := c.Get("userID").(string)
	targetID := c.Param("userId")
	if targetID == actorID {
		return c.JSON(400, echo.Map{"error": ErrCannotActOnSelf.Error()})
	}
	if s.users.IsConfigSiteAdmin(targetID) {
		return c.JSON(403, echo.Map{"error": ErrConfigAdminLocked.Error()})
	}
	if !s.db.IsDBSiteAdmin(targetID) {
		return c.JSON(404, echo.Map{"error": ErrNotRuntimeAdmin.Error()})
	}
	if err := s.db.RemoveSiteAdmin(targetID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitUserDemote(targetID, s.users.DecryptUsernameByID(targetID), actorID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetUser, targetID, auditlog.ActionUserDemote, "", nil)
	}
	return c.JSON(200, echo.Map{"user_id": targetID, "demoted": true})
}

func (s *Service) ListSiteAdmins(c echo.Context) error {
	view, err := s.listSiteAdminsView()
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, view)
}