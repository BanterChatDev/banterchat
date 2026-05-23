package guilds

import (
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/permissions"
)

type Ban struct {
	GuildID   string    `json:"guild_id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	BannedBy  string    `json:"banned_by"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Service) ExecBan(guildID, targetID, actorID, reason string) error {
	if targetID == actorID {
		return ErrCannotBanSelf
	}
	if s.isSiteAdmin(targetID) {
		return ErrCannotBanSiteAdmin
	}
	row, gerr := s.db.GetGuild(guildID)
	if gerr != nil {
		return ErrGuildNotFound
	}
	if row.OwnerID == targetID {
		return ErrCannotBanOwner
	}
	if !s.db.IsGuildMember(guildID, actorID) && !s.isSiteAdmin(actorID) {
		return ErrServerError
	}
	if err := s.db.InsertGuildBan(guildID, targetID, actorID, reason); err != nil {
		return ErrServerError
	}
	s.emitBanAdd(guildID, targetID, reason)
	isBot := s.db.IsBot(targetID)
	s.db.RemoveGuildMember(guildID, targetID)
	permissions.InvalidatePermCache(targetID)
	if s.hub != nil {
		if idx := s.hub.GuildIndex(); idx != nil {
			idx.RemoveMember(guildID, targetID)
		}
		EmitListUpdate(s.hub, targetID)
		if isBot {
			s.hub.EmitBotCommandsUpdated(guildID, targetID)
		}
	}
	if s.DeleteUserGuildMessagesFn != nil {
		go s.DeleteUserGuildMessagesFn(guildID, targetID)
	}
	if s.RecordAuditFn != nil {
		s.RecordAuditFn(actorID, guildID, auditlog.TargetUser, targetID, auditlog.ActionGuildBanAdd, reason, nil)
	}
	return nil
}

func (s *Service) ExecUnban(guildID, targetID, actorID string) error {
	if err := s.db.DeleteGuildBan(guildID, targetID); err != nil {
		return ErrServerError
	}
	s.emitBanRemove(guildID, targetID)
	if s.RecordAuditFn != nil {
		s.RecordAuditFn(actorID, guildID, auditlog.TargetUser, targetID, auditlog.ActionGuildBanRemove, "", nil)
	}
	return nil
}

func (s *Service) BanMember(c echo.Context) error {
	guildID := c.Param("guildId")
	targetID := c.Param("userId")
	actorID := c.Get("userID").(string)
	var req struct {
		Reason string `json:"reason"`
	}
	c.Bind(&req)
	if err := s.ExecBan(guildID, targetID, actorID, req.Reason); err != nil {
		if err == ErrCannotBanSelf || err == ErrCannotBanSiteAdmin || err == ErrCannotBanOwner {
			return c.JSON(403, echo.Map{"error": err.Error()})
		}
		if err == ErrGuildNotFound {
			return c.JSON(404, echo.Map{"error": err.Error()})
		}
		return c.JSON(500, echo.Map{"error": err.Error()})
	}
	return c.JSON(200, echo.Map{"message": "user banned from guild"})
}

func (s *Service) UnbanMember(c echo.Context) error {
	guildID := c.Param("guildId")
	targetID := c.Param("userId")
	actorID := c.Get("userID").(string)
	if err := s.ExecUnban(guildID, targetID, actorID); err != nil {
		return c.JSON(500, echo.Map{"error": err.Error()})
	}
	return c.JSON(200, echo.Map{"message": "user unbanned from guild"})
}

func (s *Service) ListBans(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.isSiteAdmin(userID) && !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": "not a member of this guild"})
	}
	dbRows, err := s.db.ListGuildBans(guildID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	bans := make([]Ban, 0, len(dbRows))
	for _, r := range dbRows {
		username := ""
		if s.DecryptUsernameFn != nil {
			username = s.DecryptUsernameFn(r.UserID)
		}
		bans = append(bans, Ban{
			GuildID:   r.GuildID,
			UserID:    r.UserID,
			BannedBy:  r.BannedBy,
			Reason:    r.Reason,
			CreatedAt: r.CreatedAt,
			Username:  username,
		})
	}
	return c.JSON(200, bans)
}