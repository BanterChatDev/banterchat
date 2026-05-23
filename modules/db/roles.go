package db

import (
	"strings"
	"time"
)

type RoleRow struct {
	ID          string
	GuildID     string
	Name        string
	Color       string
	Description string
	Permissions int64
	Deny        int64
	Position    int
	Mentionable bool
	Type        string
	CreatedAt   time.Time
}

func (d *DB) InsertRoleInGuild(id, guildID, name, color, description string, permissions, deny int64, position int, mentionable bool, roleType string) error {
	if roleType == "" {
		roleType = "user"
	}
	_, err := d.Exec(`INSERT INTO roles (id, guild_id, name, color, description, permissions, deny, position, mentionable, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, id, guildID, name, color, description, permissions, deny, position, mentionable, roleType)
	return err
}

func (d *DB) GetGuildDefaultRoleID(guildID string) string {
	var id string
	err := d.QueryRow(`SELECT id FROM roles WHERE guild_id = $1 ORDER BY position DESC LIMIT 1`, guildID).Scan(&id)
	if err != nil {
		return ""
	}
	return id
}

func (d *DB) GetGuildLowestRolePosition(guildID string) (int, bool) {
	var pos int
	err := d.QueryRow(`SELECT MIN(position) FROM roles WHERE guild_id = $1`, guildID).Scan(&pos)
	if err != nil {
		return 0, false
	}
	return pos, true
}

func (d *DB) ListRolesByGuild(guildID string) ([]RoleRow, error) {
	rows, err := d.Query(`SELECT id, COALESCE(guild_id,''), name, color, description, permissions, deny, position, mentionable, COALESCE(type,'user'), created_at FROM roles WHERE guild_id = $1 ORDER BY position ASC`, guildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RoleRow
	for rows.Next() {
		var r RoleRow
		if rows.Scan(&r.ID, &r.GuildID, &r.Name, &r.Color, &r.Description, &r.Permissions, &r.Deny, &r.Position, &r.Mentionable, &r.Type, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

// GetRoleGuildID returns the guild_id of a role, or "" for legacy unscoped roles.
func (d *DB) GetRoleGuildID(roleID string) string {
	var gid string
	d.QueryRow(`SELECT COALESCE(guild_id,'') FROM roles WHERE id = $1`, roleID).Scan(&gid)
	return gid
}

func (d *DB) GetRole(id string) (*RoleRow, error) {
	r := &RoleRow{}
	err := d.QueryRow(`SELECT id, COALESCE(guild_id,''), name, color, description, permissions, deny, position, mentionable, COALESCE(type,'user'), created_at FROM roles WHERE id = $1`, id).
		Scan(&r.ID, &r.GuildID, &r.Name, &r.Color, &r.Description, &r.Permissions, &r.Deny, &r.Position, &r.Mentionable, &r.Type, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (d *DB) GetGuildBotRoleCount(guildID string) int {
	var n int
	d.QueryRow(`SELECT COUNT(*) FROM roles WHERE guild_id = $1 AND type = 'bot'`, guildID).Scan(&n)
	return n
}

func (d *DB) DeleteRole(id string) error {
	_, err := d.Exec(`DELETE FROM roles WHERE id = $1`, id)
	return err
}

func (d *DB) UpdateRole(id, name, color, description string, permissions, deny int64, position int, mentionable bool) error {
	_, err := d.Exec(`UPDATE roles SET name = $1, color = $2, description = $3, permissions = $4, deny = $5, position = $6, mentionable = $7 WHERE id = $8`, name, color, description, permissions, deny, position, mentionable, id)
	return err
}

func (d *DB) GetRolePosition(roleID string) int {
	var pos int
	d.QueryRow(`SELECT position FROM roles WHERE id = $1`, roleID).Scan(&pos)
	return pos
}

func (d *DB) GetRoleMini(id string) (name, color string, permissions, deny int64, position int, err error) {
	err = d.QueryRow(`SELECT name, color, permissions, deny, position FROM roles WHERE id = $1`, id).Scan(&name, &color, &permissions, &deny, &position)
	return
}

func (d *DB) ListRoleMinis() ([]struct{ ID, Name, Color string; Permissions, Deny int64; Position int }, error) {
	rows, err := d.Query(`SELECT id, name, color, permissions, deny, position FROM roles`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []struct{ ID, Name, Color string; Permissions, Deny int64; Position int }
	for rows.Next() {
		var r struct{ ID, Name, Color string; Permissions, Deny int64; Position int }
		if rows.Scan(&r.ID, &r.Name, &r.Color, &r.Permissions, &r.Deny, &r.Position) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) UsersWithRole(roleID string) ([]string, error) {
	rows, err := d.Query(`SELECT id FROM users WHERE ',' || roles || ',' LIKE '%,' || $1 || ',%'`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

// ActorGuildTopPosition reads a user's roles in a guild and returns the
// best (lowest) position number among them. Lower number = higher rank.
// Returns 999 (the @everyone slot) when the user has no custom roles in
// the guild. Callers must check owner status separately via IsGuildOwner
// — owner bypasses all hierarchy checks on their own guild.
//
// Used by role CRUD (roles/handlers.go) and member-role assignment
// (users/handlers.go) to enforce "cannot manage roles at or above your
// own rank." Promoted from private roles.Service method to shared DB
// primitive to avoid duplicating the logic across packages.
func (d *DB) ActorGuildTopPosition(guildID, userID string) int {
	rolesStr := d.GetGuildMemberRoles(guildID, userID)
	if rolesStr == "" {
		return 999
	}
	best := 999
	for _, rid := range strings.Split(rolesStr, ",") {
		rid = strings.TrimSpace(rid)
		if rid == "" {
			continue
		}
		if pos := d.GetRolePosition(rid); pos < best {
			best = pos
		}
	}
	return best
}

// IsGuildOwner reports whether userID owns guildID.
func (d *DB) IsGuildOwner(guildID, userID string) bool {
	g, err := d.GetGuild(guildID)
	if err != nil {
		return false
	}
	return g.OwnerID == userID
}