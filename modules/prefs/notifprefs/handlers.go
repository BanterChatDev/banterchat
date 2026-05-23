package notifprefs

import (
	"github.com/labstack/echo/v4"
	"ror/modules/permissions"
)

func (s *Service) bindPref(c echo.Context, scopeType, scopeID string) (Pref, error) {
	var body struct {
		Level            string `json:"level"`
		SuppressEveryone bool   `json:"suppress_everyone"`
		SuppressRoles    bool   `json:"suppress_roles"`
	}
	if err := c.Bind(&body); err != nil {
		return Pref{}, echo.NewHTTPError(400, "invalid body")
	}
	p := defaultPref(scopeType, scopeID)
	if body.Level != "" {
		if !validLevel(body.Level) {
			return Pref{}, echo.NewHTTPError(400, "invalid level")
		}
		p.Level = body.Level
	}
	p.SuppressEveryone = body.SuppressEveryone
	p.SuppressRoles = body.SuppressRoles
	return p, nil
}

func (s *Service) ListMine(c echo.Context) error {
	userID := c.Get("userID").(string)
	out, err := s.listMine(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	return c.JSON(200, out)
}

func (s *Service) GetGlobal(c echo.Context) error {
	userID := c.Get("userID").(string)
	p, found, err := s.loadOne(userID, ScopeGlobal, "")
	if err != nil && err.Error() != "sql: no rows in result set" {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	if !found {
		p = defaultPref(ScopeGlobal, "")
	}
	return c.JSON(200, p)
}

func (s *Service) PutGlobal(c echo.Context) error {
	userID := c.Get("userID").(string)
	p, err := s.bindPref(c, ScopeGlobal, "")
	if err != nil {
		return err
	}
	if err := s.upsert(userID, p); err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	s.emitChanged(userID)
	return c.JSON(200, p)
}

func (s *Service) GetGuild(c echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": "not a member"})
	}
	p, found, err := s.loadOne(userID, ScopeGuild, guildID)
	if err != nil && err.Error() != "sql: no rows in result set" {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	if !found {
		p = defaultPref(ScopeGuild, guildID)
	}
	return c.JSON(200, p)
}

func (s *Service) PutGuild(c echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": "not a member"})
	}
	p, err := s.bindPref(c, ScopeGuild, guildID)
	if err != nil {
		return err
	}
	if err := s.upsert(userID, p); err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	s.emitChanged(userID)
	return c.JSON(200, p)
}

func (s *Service) GetChannel(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.Param("channelId")
	if !permissions.IsDM(userID, channelID) && !permissions.HasPerm(permissions.ResolveChannelPerms(s.db, userID, channelID), permissions.PermViewChannels) {
		return c.JSON(403, echo.Map{"error": "no access"})
	}
	p, found, err := s.loadOne(userID, ScopeChannel, channelID)
	if err != nil && err.Error() != "sql: no rows in result set" {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	if !found {
		p = defaultPref(ScopeChannel, channelID)
	}
	return c.JSON(200, p)
}

func (s *Service) PutChannel(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.Param("channelId")
	if !permissions.IsDM(userID, channelID) && !permissions.HasPerm(permissions.ResolveChannelPerms(s.db, userID, channelID), permissions.PermViewChannels) {
		return c.JSON(403, echo.Map{"error": "no access"})
	}
	p, err := s.bindPref(c, ScopeChannel, channelID)
	if err != nil {
		return err
	}
	if err := s.upsert(userID, p); err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	s.emitChanged(userID)
	return c.JSON(200, p)
}

func (s *Service) Reset(c echo.Context) error {
	userID := c.Get("userID").(string)
	scopeType := c.Param("scopeType")
	scopeID := c.Param("scopeId")
	if scopeType != ScopeGlobal && scopeType != ScopeGuild && scopeType != ScopeChannel {
		return c.JSON(400, echo.Map{"error": "invalid scope_type"})
	}
	if scopeType == ScopeGlobal {
		scopeID = ""
	}
	if err := s.deleteScope(userID, scopeType, scopeID); err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	s.emitChanged(userID)
	return c.JSON(200, echo.Map{"ok": true})
}