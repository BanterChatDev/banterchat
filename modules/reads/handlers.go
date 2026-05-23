package reads

import (
	"github.com/labstack/echo/v4"
	"ror/modules/permissions"
)

func (s *Service) GetReads(c echo.Context) error {
	userID := c.Get("userID").(string)
	dbRows, err := s.getUnreads(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	result := make([]Read, 0, len(dbRows))
	dropped := 0
	for _, r := range dbRows {
		perms := permissions.ResolveChannelPerms(s.db, userID, r.ChannelID)
		if !permissions.HasPerm(perms, permissions.PermViewChannels) {
			if !permissions.IsDM(userID, r.ChannelID) {
				dropped++
				continue
			}
		}
		result = append(result, Read{ChannelID: r.ChannelID, GuildID: r.GuildID, Unread: r.Unread, Mentions: r.Mentions})
	}
	return c.JSON(200, result)
}

func (s *Service) MarkRead(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.Param("id")
	s.markRead(userID, channelID)
	s.emitMarkRead(userID, channelID)
	return c.JSON(200, echo.Map{"ok": true})
}