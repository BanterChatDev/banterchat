package db

import (
	"database/sql"
	"fmt"
	"time"
)

type GuildRow struct {
	ID               string
	Name             string
	NameHash         string
	Icon             string
	Banner           string
	BannerCrop       string
	Description      string
	OwnerID          string
	WelcomeChannelID string
	CreatedAt        time.Time
}

type GuildMemberRow struct {
	GuildID  string
	UserID   string
	Roles    string
	Nickname string
	JoinedAt time.Time
}

type GuildInviteRow struct {
	ID        string
	GuildID   string
	CreatedBy string
	Code      string
	Uses      int
	MaxUses   int
	ExpiresAt *time.Time
	CreatedAt time.Time
}

// --- Ensure tables ---

func (d *DB) InsertGuild(id, name, nameHash, icon, ownerID string) error {
	_, err := d.Exec(`INSERT INTO guilds (id, name, name_hash, icon, owner_id) VALUES ($1, $2, $3, $4, $5)`, id, name, nameHash, icon, ownerID)
	return err
}

func (d *DB) GetGuild(id string) (*GuildRow, error) {
	g := &GuildRow{}
	err := d.QueryRow(`SELECT id, name, name_hash, icon, COALESCE(banner,''), COALESCE(banner_crop,''), COALESCE(description,''), owner_id, COALESCE(welcome_channel_id,''), created_at FROM guilds WHERE id = $1`, id).
		Scan(&g.ID, &g.Name, &g.NameHash, &g.Icon, &g.Banner, &g.BannerCrop, &g.Description, &g.OwnerID, &g.WelcomeChannelID, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return g, nil
}

func (d *DB) ListGuildsForUser(userID string) ([]GuildRow, error) {
	rows, err := d.Query(`SELECT g.id, g.name, g.name_hash, g.icon, COALESCE(g.banner,''), COALESCE(g.banner_crop,''), COALESCE(g.description,''), g.owner_id, COALESCE(g.welcome_channel_id,''), g.created_at FROM guilds g JOIN guild_members gm ON g.id = gm.guild_id WHERE gm.user_id = $1 AND gm.user_id NOT IN (SELECT user_id FROM bans) ORDER BY gm.joined_at ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildRow
	for rows.Next() {
		var g GuildRow
		if rows.Scan(&g.ID, &g.Name, &g.NameHash, &g.Icon, &g.Banner, &g.BannerCrop, &g.Description, &g.OwnerID, &g.WelcomeChannelID, &g.CreatedAt) == nil {
			out = append(out, g)
		}
	}
	return out, nil
}

func (d *DB) ListGuildIDsForUser(userID string) ([]string, error) {
	rows, err := d.Query(`SELECT guild_id FROM guild_members WHERE user_id = $1 AND user_id NOT IN (SELECT user_id FROM bans)`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			out = append(out, id)
		}
	}
	return out, nil
}

func (d *DB) ListMutualGuilds(userA, userB string) ([]GuildRow, error) {
	rows, err := d.Query(`SELECT g.id, g.name, g.name_hash, g.icon, COALESCE(g.banner,''), COALESCE(g.banner_crop,''), COALESCE(g.description,''), g.owner_id, COALESCE(g.welcome_channel_id,''), g.created_at FROM guilds g JOIN guild_members a ON g.id = a.guild_id AND a.user_id = $1 JOIN guild_members b ON g.id = b.guild_id AND b.user_id = $2 ORDER BY g.name`, userA, userB)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildRow
	for rows.Next() {
		var g GuildRow
		if rows.Scan(&g.ID, &g.Name, &g.NameHash, &g.Icon, &g.Banner, &g.BannerCrop, &g.Description, &g.OwnerID, &g.WelcomeChannelID, &g.CreatedAt) == nil {
			out = append(out, g)
		}
	}
	return out, nil
}

func (d *DB) ListAllGuilds() ([]GuildRow, error) {
	rows, err := d.Query(`SELECT id, name, name_hash, icon, COALESCE(banner,''), COALESCE(banner_crop,''), COALESCE(description,''), owner_id, COALESCE(welcome_channel_id,''), created_at FROM guilds ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildRow
	for rows.Next() {
		var g GuildRow
		if rows.Scan(&g.ID, &g.Name, &g.NameHash, &g.Icon, &g.Banner, &g.BannerCrop, &g.Description, &g.OwnerID, &g.WelcomeChannelID, &g.CreatedAt) == nil {
			out = append(out, g)
		}
	}
	return out, nil
}

func (d *DB) UpdateGuildName(id, name, nameHash string) error {
	_, err := d.Exec(`UPDATE guilds SET name = $1, name_hash = $2 WHERE id = $3`, name, nameHash, id)
	return err
}

func (d *DB) UpdateGuildDescription(id, description string) error {
	_, err := d.Exec(`UPDATE guilds SET description = $1 WHERE id = $2`, description, id)
	return err
}

func (d *DB) UpdateGuildIcon(id, icon string) error {
	_, err := d.Exec(`UPDATE guilds SET icon = $1 WHERE id = $2`, icon, id)
	return err
}

func (d *DB) UpdateGuildWelcomeChannel(id, channelID string) error {
	_, err := d.Exec(`UPDATE guilds SET welcome_channel_id = $1 WHERE id = $2`, channelID, id)
	return err
}

func (d *DB) UpdateGuildOwner(guildID, newOwnerID string) error {
	_, err := d.Exec(`UPDATE guilds SET owner_id = $1 WHERE id = $2`, newOwnerID, guildID)
	return err
}

func (d *DB) GetGuildWelcomeChannelID(id string) string {
	var ch string
	d.QueryRow(`SELECT COALESCE(welcome_channel_id,'') FROM guilds WHERE id = $1`, id).Scan(&ch)
	return ch
}

func (d *DB) DeleteGuild(id string) error {
	_, err := d.Exec(`DELETE FROM guilds WHERE id = $1`, id)
	return err
}

// --- Guild Members ---

func (d *DB) InsertGuildMember(guildID, userID, roles string) error {
	_, err := d.Exec(`INSERT INTO guild_members (guild_id, user_id, roles) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, guildID, userID, roles)
	if err == nil && d.OnGuildMembershipChange != nil {
		d.OnGuildMembershipChange(guildID)
	}
	return err
}

func (d *DB) RemoveGuildMember(guildID, userID string) error {
	_, err := d.Exec(`DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2`, guildID, userID)
	if err == nil && d.OnGuildMembershipChange != nil {
		d.OnGuildMembershipChange(guildID)
	}
	return err
}

func (d *DB) DeleteGuildMembersByUser(userID string) error {
	_, err := d.Exec(`DELETE FROM guild_members WHERE user_id = $1`, userID)
	if err == nil && d.OnGuildMembershipChange != nil {
		d.OnGuildMembershipChange("")
	}
	return err
}

func (d *DB) GetGuildMember(guildID, userID string) (*GuildMemberRow, error) {
	m := &GuildMemberRow{}
	err := d.QueryRow(`SELECT guild_id, user_id, roles, nickname, joined_at FROM guild_members WHERE guild_id = $1 AND user_id = $2`, guildID, userID).
		Scan(&m.GuildID, &m.UserID, &m.Roles, &m.Nickname, &m.JoinedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (d *DB) ListGuildMembers(guildID string) ([]GuildMemberRow, error) {
	rows, err := d.Query(`SELECT gm.guild_id, gm.user_id, gm.roles, gm.nickname, gm.joined_at FROM guild_members gm WHERE gm.guild_id = $1 AND gm.user_id NOT IN (SELECT user_id FROM bans) ORDER BY gm.joined_at ASC`, guildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildMemberRow
	for rows.Next() {
		var m GuildMemberRow
		if rows.Scan(&m.GuildID, &m.UserID, &m.Roles, &m.Nickname, &m.JoinedAt) == nil {
			out = append(out, m)
		}
	}
	return out, nil
}

func (d *DB) GetGuildMemberNicknames(guildID string, userIDs []string) map[string]string {
	out := make(map[string]string)
	if len(userIDs) == 0 {
		return out
	}
	args := make([]interface{}, 0, len(userIDs)+1)
	args = append(args, guildID)
	placeholders := ""
	for i, uid := range userIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += fmt.Sprintf("$%d", i+2)
		args = append(args, uid)
	}
	rows, err := d.Query(`SELECT user_id, nickname FROM guild_members WHERE guild_id = $1 AND user_id IN (`+placeholders+`)`, args...)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var uid, nick string
		if rows.Scan(&uid, &nick) == nil {
			out[uid] = nick
		}
	}
	return out
}

func (d *DB) UpdateGuildMemberRoles(guildID, userID, roles string) error {
	_, err := d.Exec(`UPDATE guild_members SET roles = $1 WHERE guild_id = $2 AND user_id = $3`, roles, guildID, userID)
	if err == nil && d.OnGuildMembershipChange != nil {
		d.OnGuildMembershipChange(guildID)
	}
	return err
}

func (d *DB) GetGuildMemberNickname(guildID, userID string) string {
	var nick string
	if err := d.QueryRow(`SELECT nickname FROM guild_members WHERE guild_id = $1 AND user_id = $2`, guildID, userID).Scan(&nick); err != nil {
		return ""
	}
	return nick
}

func (d *DB) UpdateGuildMemberNickname(guildID, userID, nickname string) error {
	_, err := d.Exec(`UPDATE guild_members SET nickname = $1 WHERE guild_id = $2 AND user_id = $3`, nickname, guildID, userID)
	if err == nil && d.OnGuildMembershipChange != nil {
		d.OnGuildMembershipChange(guildID)
	}
	return err
}

func (d *DB) IsGuildMember(guildID, userID string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM guild_members WHERE guild_id = $1 AND user_id = $2`, guildID, userID).Scan(&count)
	return count > 0
}

func (d *DB) CountGuildMembers(guildID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM guild_members WHERE guild_id = $1 AND user_id NOT IN (SELECT user_id FROM bans)`, guildID).Scan(&c)
	return c
}

func (d *DB) GetGuildMemberRoles(guildID, userID string) string {
	var r string
	d.QueryRow(`SELECT roles FROM guild_members WHERE guild_id = $1 AND user_id = $2`, guildID, userID).Scan(&r)
	return r
}

// --- Guild Invites ---

func (d *DB) InsertGuildInvite(id, guildID, createdBy, code string, maxUses int, expiresAt *time.Time) error {
	_, err := d.Exec(`INSERT INTO guild_invites (id, guild_id, created_by, code, max_uses, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`, id, guildID, createdBy, code, maxUses, expiresAt)
	return err
}

func (d *DB) GetGuildInviteByCode(code string) (*GuildInviteRow, error) {
	i := &GuildInviteRow{}
	err := d.QueryRow(`SELECT id, guild_id, created_by, code, uses, max_uses, expires_at, created_at FROM guild_invites WHERE code = $1`, code).
		Scan(&i.ID, &i.GuildID, &i.CreatedBy, &i.Code, &i.Uses, &i.MaxUses, &i.ExpiresAt, &i.CreatedAt)
	if err != nil {
		return nil, err
	}
	return i, nil
}

func (d *DB) ConsumeGuildInvite(inviteID string) (consumed bool, uses int, exhausted bool, err error) {
	var maxUses int
	err = d.QueryRow(`UPDATE guild_invites
		SET uses = uses + 1
		WHERE id = $1
		  AND (max_uses = 0 OR uses < max_uses)
		  AND (expires_at IS NULL OR expires_at > NOW())
		RETURNING uses, max_uses`, inviteID).Scan(&uses, &maxUses)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, 0, false, nil
		}
		return false, 0, false, err
	}
	exhausted = maxUses > 0 && uses >= maxUses
	return true, uses, exhausted, nil
}

func (d *DB) ListGuildInvites(guildID string) ([]GuildInviteRow, error) {
	rows, err := d.Query(`SELECT id, guild_id, created_by, code, uses, max_uses, expires_at, created_at FROM guild_invites WHERE guild_id = $1 ORDER BY created_at DESC`, guildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildInviteRow
	for rows.Next() {
		var i GuildInviteRow
		if rows.Scan(&i.ID, &i.GuildID, &i.CreatedBy, &i.Code, &i.Uses, &i.MaxUses, &i.ExpiresAt, &i.CreatedAt) == nil {
			out = append(out, i)
		}
	}
	return out, nil
}

func (d *DB) DeleteGuildInvite(id string) error {
	_, err := d.Exec(`DELETE FROM guild_invites WHERE id = $1`, id)
	return err
}

func (d *DB) CountGuilds() int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM guilds`).Scan(&c)
	return c
}