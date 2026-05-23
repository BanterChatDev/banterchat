package db

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

type channelMetaEntry struct {
	guildID         string
	categoryID      string
	parentID        string
	chanType        string
	slowmodeSeconds int
	expires         time.Time
}

var (
	channelMetaCache sync.Map
	channelMetaTTL   = 60 * time.Second
)

func (d *DB) loadChannelMeta(channelID string) channelMetaEntry {
	now := time.Now()
	if cached, ok := channelMetaCache.Load(channelID); ok {
		if e, ok := cached.(channelMetaEntry); ok && now.Before(e.expires) {
			return e
		}
	}
	var e channelMetaEntry
	d.QueryRow(`SELECT COALESCE(guild_id,''), COALESCE(category_id,''), COALESCE(parent_channel_id,''), COALESCE(type,'text'), COALESCE(slowmode_seconds,0) FROM channels WHERE id = $1`, channelID).
		Scan(&e.guildID, &e.categoryID, &e.parentID, &e.chanType, &e.slowmodeSeconds)
	e.expires = now.Add(channelMetaTTL)
	channelMetaCache.Store(channelID, e)
	return e
}

func InvalidateChannelMeta(channelID string) {
	channelMetaCache.Delete(channelID)
}

type ChannelRow struct {
	ID              string
	GuildID         string
	Name            string
	Description     string
	Position        int
	CategoryID      string
	CreatedBy       string
	CreatedAt       time.Time
	Type            string
	SlowmodeSeconds int
}

type ChannelPermRow struct {
	ChannelID string
	RoleID    string
	RoleName  string
	RoleColor string
	Allow     int64
	Deny      int64
}

func (d *DB) ListChannelsByGuild(guildID string) ([]ChannelRow, error) {
	rows, err := d.Query(`SELECT id, COALESCE(guild_id,''), name, description, position, COALESCE(category_id,''), created_by, created_at, COALESCE(type,'text'), COALESCE(slowmode_seconds,0) FROM channels WHERE guild_id = $1 AND COALESCE(type,'text') <> 'thread' ORDER BY position ASC, created_at ASC`, guildID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []ChannelRow
	for rows.Next() {
		var c ChannelRow
		if rows.Scan(&c.ID, &c.GuildID, &c.Name, &c.Description, &c.Position, &c.CategoryID, &c.CreatedBy, &c.CreatedAt, &c.Type, &c.SlowmodeSeconds) == nil { out = append(out, c) }
	}
	return out, nil
}

func (d *DB) GetChannelGuildID(channelID string) string {
	return d.loadChannelMeta(channelID).guildID
}

func (d *DB) GetChannelSlowmode(channelID string) int {
	return d.loadChannelMeta(channelID).slowmodeSeconds
}

func (d *DB) GetChannel(id string) (*ChannelRow, error) {
	c := &ChannelRow{}
	err := d.QueryRow(`SELECT id, COALESCE(guild_id,''), name, description, position, COALESCE(category_id,''), created_by, created_at, COALESCE(type,'text'), COALESCE(slowmode_seconds,0) FROM channels WHERE id = $1`, id).
		Scan(&c.ID, &c.GuildID, &c.Name, &c.Description, &c.Position, &c.CategoryID, &c.CreatedBy, &c.CreatedAt, &c.Type, &c.SlowmodeSeconds)
	if err != nil { return nil, err }
	return c, nil
}

func (d *DB) InsertChannel(id, name, nameHash, description, categoryID, createdBy, chType string) error {
	if chType == "" {
		chType = "text"
	}
	_, err := d.Exec(`INSERT INTO channels (id, name, name_hash, description, category_id, created_by, type) VALUES ($1, $2, $3, $4, $5, $6, $7)`, id, name, nameHash, description, categoryID, createdBy, chType)
	return err
}

// InsertChannelInGuild is the guild-scoped version; Phase 3 migrates all
// call sites from InsertChannel to this. The legacy InsertChannel is kept
// alive for DM channel creation (where guild_id stays empty).
func (d *DB) InsertChannelInGuild(id, guildID, name, nameHash, description, categoryID, createdBy, chType string) error {
	if chType == "" {
		chType = "text"
	}
	_, err := d.Exec(`INSERT INTO channels (id, guild_id, name, name_hash, description, category_id, created_by, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, id, guildID, name, nameHash, description, categoryID, createdBy, chType)
	return err
}

func (d *DB) DeleteChannel(id string) error {
	_, err := d.Exec(`DELETE FROM channels WHERE id = $1`, id)
	InvalidateChannelMeta(id)
	return err
}

func (d *DB) UpdateChannel(id, name, nameHash, description string, position int, categoryID string) error {
	_, err := d.Exec(`UPDATE channels SET name = $1, name_hash = $2, description = $3, position = $4, category_id = $5 WHERE id = $6`, name, nameHash, description, position, categoryID, id)
	InvalidateChannelMeta(id)
	return err
}

func (d *DB) UpdateChannelSlowmode(id string, seconds int) error {
	_, err := d.Exec(`UPDATE channels SET slowmode_seconds = $1 WHERE id = $2`, seconds, id)
	InvalidateChannelMeta(id)
	return err
}

func (d *DB) ReorderChannels(items []struct{ ID string; Position int; CategoryID string }) error {
	tx, err := d.Begin()
	if err != nil { return err }
	stmt, err := tx.Prepare(`UPDATE channels SET position = $1, category_id = $2 WHERE id = $3`)
	if err != nil { tx.Rollback(); return err }
	defer stmt.Close()
	for _, item := range items {
		if _, err := stmt.Exec(item.Position, item.CategoryID, item.ID); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func (d *DB) GetChannelPerms(channelID string) ([]ChannelPermRow, error) {
	rows, err := d.Query(`SELECT cp.channel_id, cp.role_id, r.name, r.color, cp.allow, cp.deny FROM channel_permissions cp JOIN roles r ON cp.role_id = r.id WHERE cp.channel_id = $1 ORDER BY r.position ASC`, channelID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []ChannelPermRow
	for rows.Next() {
		var p ChannelPermRow
		if rows.Scan(&p.ChannelID, &p.RoleID, &p.RoleName, &p.RoleColor, &p.Allow, &p.Deny) == nil { out = append(out, p) }
	}
	return out, nil
}

func (d *DB) SetChannelPerm(channelID, roleID string, allow, deny int64) error {
	if allow == 0 && deny == 0 {
		_, err := d.Exec(`DELETE FROM channel_permissions WHERE channel_id = $1 AND role_id = $2`, channelID, roleID)
		return err
	}
	_, err := d.Exec(`INSERT INTO channel_permissions (channel_id, role_id, allow, deny) VALUES ($1, $2, $3, $4) ON CONFLICT(channel_id, role_id) DO UPDATE SET allow = excluded.allow, deny = excluded.deny`, channelID, roleID, allow, deny)
	return err
}

func (d *DB) GetChannelCategoryID(channelID string) string {
	return d.loadChannelMeta(channelID).categoryID
}

func (d *DB) GetChannelType(channelID string) string {
	return d.loadChannelMeta(channelID).chanType
}

func (d *DB) CountMessagesInGuild(guildID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM messages m JOIN channels c ON c.id = m.channel_id WHERE c.guild_id = $1`, guildID).Scan(&c)
	return c
}

func (d *DB) CountAllMessages() int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM messages`).Scan(&c)
	return c
}

func (d *DB) CountChannelsInGuild(guildID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM channels WHERE guild_id = $1`, guildID).Scan(&c)
	return c
}

func (d *DB) GetChannelParentID(channelID string) string {
	return d.loadChannelMeta(channelID).parentID
}

func (d *DB) InsertThread(id, parentChannelID, guildID, encName, nameHash, ownerID, parentMessageID string, autoArchiveMinutes int) error {
	_, err := d.Exec(
		`INSERT INTO channels (id, guild_id, name, name_hash, description, category_id, created_by, type, parent_channel_id, parent_message_id, owner_id, auto_archive_minutes) VALUES ($1, $2, $3, $4, '', '', $5, 'thread', $6, $7, $5, $8)`,
		id, guildID, encName, nameHash, ownerID, parentChannelID, parentMessageID, autoArchiveMinutes,
	)
	return err
}

func (d *DB) ListThreadsByParent(parentChannelID string, includeArchived bool) ([]ChannelRow, error) {
	q := `SELECT id, COALESCE(guild_id,''), name, description, position, COALESCE(category_id,''), created_by, created_at, COALESCE(type,'text'), COALESCE(slowmode_seconds,0) FROM channels WHERE parent_channel_id = $1 AND type = 'thread'`
	if !includeArchived {
		q += ` AND archived = false`
	}
	q += ` ORDER BY created_at DESC`
	rows, err := d.Query(q, parentChannelID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []ChannelRow
	for rows.Next() {
		var c ChannelRow
		if rows.Scan(&c.ID, &c.GuildID, &c.Name, &c.Description, &c.Position, &c.CategoryID, &c.CreatedBy, &c.CreatedAt, &c.Type, &c.SlowmodeSeconds) == nil { out = append(out, c) }
	}
	return out, nil
}

type ThreadFlags struct {
	HasActive   bool
	HasArchived bool
}

func (d *DB) ThreadFlagsByParents(parentChannelIDs []string) map[string]ThreadFlags {
	out := make(map[string]ThreadFlags, len(parentChannelIDs))
	if len(parentChannelIDs) == 0 {
		return out
	}
	ph := make([]string, len(parentChannelIDs))
	args := make([]interface{}, len(parentChannelIDs))
	for i, id := range parentChannelIDs {
		ph[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	rows, err := d.Query(
		`SELECT parent_channel_id,
			COALESCE(BOOL_OR(NOT archived), false) AS has_active,
			COALESCE(BOOL_OR(archived), false) AS has_archived
		FROM channels
		WHERE type = 'thread' AND parent_channel_id IN (`+strings.Join(ph, ",")+`)
		GROUP BY parent_channel_id`,
		args...,
	)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var pid string
		var hasActive, hasArchived bool
		if rows.Scan(&pid, &hasActive, &hasArchived) == nil {
			out[pid] = ThreadFlags{HasActive: hasActive, HasArchived: hasArchived}
		}
	}
	return out
}

func (d *DB) SetThreadArchived(threadID string, archived bool) error {
	if archived {
		_, err := d.Exec(`UPDATE channels SET archived = true, archived_at = NOW() WHERE id = $1 AND type = 'thread'`, threadID)
		return err
	}
	_, err := d.Exec(`UPDATE channels SET archived = false, archived_at = NULL WHERE id = $1 AND type = 'thread'`, threadID)
	return err
}

func (d *DB) IncrementThreadMessageCount(threadID string) {
	d.Exec(`UPDATE channels SET message_count = message_count + 1 WHERE id = $1 AND type = 'thread'`, threadID)
}

func (d *DB) GetThreadMeta(threadID string) (parentChannelID, guildID, ownerID, parentMessageID string, archived bool, found bool) {
	row := d.QueryRow(
		`SELECT COALESCE(parent_channel_id,''), COALESCE(guild_id,''), COALESCE(owner_id,''), COALESCE(parent_message_id,''), archived FROM channels WHERE id = $1 AND type = 'thread'`,
		threadID,
	)
	if err := row.Scan(&parentChannelID, &guildID, &ownerID, &parentMessageID, &archived); err != nil {
		return "", "", "", "", false, false
	}
	return parentChannelID, guildID, ownerID, parentMessageID, archived, true
}