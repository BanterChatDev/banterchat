package roles

import (
	"time"

	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/permissions"
)

type Role struct {
	ID          string    `json:"id"`
	GuildID     string    `json:"guild_id"`
	Name        string    `json:"name"`
	Color       string    `json:"color"`
	Description string    `json:"description"`
	Permissions int64     `json:"permissions"`
	Deny        int64     `json:"deny"`
	Position    int       `json:"position"`
	Mentionable bool      `json:"mentionable"`
	Type        string    `json:"type"`
	CreatedAt   time.Time `json:"created_at"`
}

// createRole (unscoped — created rows without guild_id) removed.
// createRoleInGuild is the live variant.

func (s *Service) createRoleInGuild(guildID, name, color, description, masterKey string, permissions, deny int64, position int, mentionable bool, roleType string) (*Role, error) {
	if roleType == "" {
		roleType = "user"
	}
	rid := id.Generate()
	encName := encryption.EncryptField(name, masterKey)
	encDesc := encryption.EncryptField(description, masterKey)
	err := s.db.InsertRoleInGuild(rid, guildID, encName, color, encDesc, permissions, deny, position, mentionable, roleType)
	if err != nil {
		return nil, err
	}
	return &Role{ID: rid, GuildID: guildID, Name: name, Color: color, Description: description, Permissions: permissions, Deny: deny, Position: position, Mentionable: mentionable, Type: roleType, CreatedAt: time.Now()}, nil
}

func pickBotRoleColor(palette []string, seed string) string {
	if len(palette) == 0 {
		return ""
	}
	var h uint32
	for i := 0; i < len(seed); i++ {
		h = h*31 + uint32(seed[i])
	}
	return palette[int(h)%len(palette)]
}

func (s *Service) CreateBotRoleInGuild(guildID, botName, botUserID string, perms int64) (*Role, error) {
	everyonePos := s.cfg.DefaultPosition
	if defaultID := s.db.GetGuildDefaultRoleID(guildID); defaultID != "" {
		if r, err := s.db.GetRole(defaultID); err == nil && r != nil {
			everyonePos = r.Position
		}
	}
	botCount := s.db.GetGuildBotRoleCount(guildID)
	position := everyonePos - botCount - 1
	color := pickBotRoleColor(s.cfg.BotColors, botUserID)
	if color == "" {
		color = s.cfg.DefaultColor
	}
	allowed := perms & permissions.PermAll
	logger.Info("oauth2: CreateBotRoleInGuild",
		"guild", guildID,
		"bot", botName,
		"bot_user_id", botUserID,
		"perms_in", perms,
		"perm_all", permissions.PermAll,
		"perms_allowed", allowed,
		"everyone_pos", everyonePos,
		"bot_count", botCount,
		"position", position,
	)
	role, err := s.createRoleInGuild(guildID, botName, color, "Managed role for bot "+botName, s.masterKey, allowed, 0, position, true, "bot")
	if err != nil {
		logger.Error("oauth2: createRoleInGuild failed", "error", err, "guild", guildID, "bot", botName)
		return nil, err
	}
	s.emitCreate(guildID, role)
	return role, nil
}

func (s *Service) roleFromRow(r *db.RoleRow) *Role {
	return &Role{
		ID:          r.ID,
		GuildID:     r.GuildID,
		Name:        encryption.DecryptField(r.Name, s.masterKey),
		Color:       r.Color,
		Description: encryption.DecryptField(r.Description, s.masterKey),
		Permissions: r.Permissions,
		Deny:        r.Deny,
		Position:    r.Position,
		Mentionable: r.Mentionable,
		Type:        r.Type,
		CreatedAt:   r.CreatedAt,
	}
}

func (s *Service) listRolesInGuild(guildID string) ([]Role, error) {
	dbRows, err := s.db.ListRolesByGuild(guildID)
	if err != nil {
		return nil, err
	}
	roles := make([]Role, len(dbRows))
	for i := range dbRows {
		roles[i] = *s.roleFromRow(&dbRows[i])
	}
	return roles, nil
}

func (s *Service) getRole(id string) (*Role, error) {
	row, err := s.db.GetRole(id)
	if err != nil {
		return nil, err
	}
	return s.roleFromRow(row), nil
}

func (s *Service) deleteRole(id string) error {
	return s.db.DeleteRole(id)
}

func (s *Service) updateRole(id, name, color, description, masterKey string, permissions, deny int64, position int, mentionable bool) error {
	encName := encryption.EncryptField(name, masterKey)
	encDesc := encryption.EncryptField(description, masterKey)
	return s.db.UpdateRole(id, encName, color, encDesc, permissions, deny, position, mentionable)
}