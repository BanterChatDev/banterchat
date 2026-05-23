package users

import (
	"github.com/labstack/echo/v4"
	"ror/modules/permissions"
)

func (s *Service) ResolveChannelPerms(userID, channelID string) int64 {
	return permissions.ResolveChannelPerms(s.db, userID, channelID)
}

func (s *Service) ListChannelMembersHandler(c echo.Context) error {
	channelID := c.Param("id")
	userID := c.Get("userID").(string)
	if channelID != "" {
		guildID := s.db.GetChannelGuildID(channelID)
		if guildID != "" && !s.db.IsGuildMember(guildID, userID) {
			return c.JSON(403, echo.Map{"error": "not a guild member"})
		}
		perms := s.ResolveChannelPerms(userID, channelID)
		if !permissions.HasPerm(perms, permissions.PermViewChannels) {
			return c.JSON(403, echo.Map{"error": "not allowed"})
		}
	}
	limit, offset, search := s.parsePagination(c)
	result, total, onlineCount, _, err := s.buildMemberList(memberListOpts{
		search: search, offset: offset, limit: limit, channelID: channelID,
		actorID: userID,
	})
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"users": result, "total": total, "online_count": onlineCount})
}