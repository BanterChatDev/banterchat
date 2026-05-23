package db

import (
	"database/sql"
	"fmt"
	"strings"
)

type RoleOverride struct {
	Allow int64
	Deny  int64
}

func (d *DB) GetRolePermsBatch(roleIDs []string) (*sql.Rows, error) {
	ph := make([]string, len(roleIDs))
	args := make([]interface{}, len(roleIDs))
	for i, id := range roleIDs {
		ph[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	return d.Query(`SELECT id, permissions, deny, position FROM roles WHERE id IN (`+strings.Join(ph, ",")+`)`, args...)
}

func (d *DB) GetChannelPermOverridesAllRoles(channelID string) map[string]RoleOverride {
	out := make(map[string]RoleOverride)
	rows, err := d.Query(`SELECT role_id, allow, deny FROM channel_permissions WHERE channel_id = $1`, channelID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var rid string
		var a, dn int64
		if rows.Scan(&rid, &a, &dn) == nil {
			out[rid] = RoleOverride{Allow: a, Deny: dn}
		}
	}
	return out
}

func (d *DB) GetCategoryPermOverridesAllRoles(categoryID string) map[string]RoleOverride {
	out := make(map[string]RoleOverride)
	rows, err := d.Query(`SELECT role_id, allow, deny FROM category_permissions WHERE category_id = $1`, categoryID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var rid string
		var a, dn int64
		if rows.Scan(&rid, &a, &dn) == nil {
			out[rid] = RoleOverride{Allow: a, Deny: dn}
		}
	}
	return out
}

func (d *DB) GetGuildMembersRolesBatch(guildID string, userIDs []string) map[string]string {
	out := make(map[string]string, len(userIDs))
	if len(userIDs) == 0 {
		return out
	}
	ph := make([]string, len(userIDs))
	args := []interface{}{guildID}
	for i, uid := range userIDs {
		ph[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, uid)
	}
	rows, err := d.Query(`SELECT user_id, roles FROM guild_members WHERE guild_id = $1 AND user_id IN (`+strings.Join(ph, ",")+`)`, args...)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var uid, roles string
		if rows.Scan(&uid, &roles) == nil {
			out[uid] = roles
		}
	}
	return out
}