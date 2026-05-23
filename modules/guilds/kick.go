package guilds

import (
	"github.com/labstack/echo/v4"
	"ror/modules/permissions"
)

// ExecKick removes a member from a guild without recording a ban. The
// target can rejoin via invite. Parallels ExecBan but skips the
// guild_bans insert and emits guild_member_remove instead of
// guild_ban_add. Same safety guards: cannot kick self, cannot kick the
// owner, cannot kick a site admin.
func (s *Service) ExecKick(guildID, targetID, actorID string) error {
	if targetID == actorID {
		return ErrCannotBanSelf
	}
	if s.isSiteAdmin(targetID) {
		return ErrCannotBanSiteAdmin
	}
	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return ErrGuildNotFound
	}
	if row.OwnerID == targetID {
		return ErrCannotKickOwner
	}
	if !s.db.IsGuildMember(guildID, targetID) {
		return ErrNotAMember
	}
	isBot := s.db.IsBot(targetID)
	s.db.RemoveGuildMember(guildID, targetID)
	permissions.InvalidatePermCache(targetID)
	if s.hub != nil {
		EmitMemberRemove(s.hub, guildID, targetID)
		EmitListUpdate(s.hub, targetID)
		if isBot {
			s.hub.EmitBotCommandsUpdated(guildID, targetID)
		}
	}
	return nil
}

func (s *Service) KickMember(c echo.Context) error {
	guildID := c.Param("guildId")
	targetID := c.Param("userId")
	actorID := c.Get("userID").(string)
	if err := s.ExecKick(guildID, targetID, actorID); err != nil {
		if err == ErrCannotBanSelf || err == ErrCannotBanSiteAdmin || err == ErrCannotKickOwner {
			return c.JSON(403, echo.Map{"error": err.Error()})
		}
		if err == ErrGuildNotFound || err == ErrNotAMember {
			return c.JSON(404, echo.Map{"error": err.Error()})
		}
		return c.JSON(500, echo.Map{"error": err.Error()})
	}
	return c.JSON(200, echo.Map{"message": "user kicked from guild"})
}
