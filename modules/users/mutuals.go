package users

import (
	"ror/modules/encryption"

	"github.com/labstack/echo/v4"
)

func (s *Service) GetMutuals(c echo.Context) error {
	currentUserID, ok := c.Get("userID").(string)
	if !ok || currentUserID == "" {
		return c.JSON(401, echo.Map{"error": "unauthorized"})
	}
	targetUserID := c.Param("id")
	if targetUserID == "" || targetUserID == currentUserID {
		return c.JSON(200, echo.Map{"guilds": []echo.Map{}, "friends": []echo.Map{}})
	}

	guilds := []echo.Map{}
	if gs, err := s.db.ListMutualGuilds(currentUserID, targetUserID); err == nil {
		for _, g := range gs {
			guilds = append(guilds, echo.Map{
				"id":   g.ID,
				"name": encryption.DecryptField(g.Name, s.masterKey),
				"icon": g.Icon,
			})
		}
	}

	friends := []echo.Map{}
	myFriends, _ := s.db.ListFriends(currentUserID, "accepted")
	peerFriends, _ := s.db.ListFriends(targetUserID, "accepted")
	mine := map[string]bool{}
	for _, f := range myFriends {
		other := f.ToUserID
		if other == currentUserID {
			other = f.FromUserID
		}
		if other != "" {
			mine[other] = true
		}
	}
	seen := map[string]bool{}
	for _, f := range peerFriends {
		other := f.ToUserID
		if other == targetUserID {
			other = f.FromUserID
		}
		if other == "" || other == currentUserID || seen[other] || !mine[other] {
			continue
		}
		seen[other] = true
		avatarID := ""
		if s.GetAvatarID != nil {
			avatarID = s.GetAvatarID(other)
		}
		friends = append(friends, echo.Map{
			"id":           other,
			"username":     s.DecryptUsernameByID(other),
			"display_name": s.ResolveDisplayName(other, ""),
			"avatar_id":    avatarID,
		})
	}

	return c.JSON(200, echo.Map{"guilds": guilds, "friends": friends})
}