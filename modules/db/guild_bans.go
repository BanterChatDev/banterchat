package db

import "time"

// Guild-scoped bans. Separate from the global `bans` table.
// A user banned from a guild cannot rejoin that guild but can still log in
// and use other guilds unless they're also in the global `bans` table.

type GuildBanRow struct {
	GuildID   string
	UserID    string
	BannedBy  string
	Reason    string
	CreatedAt time.Time
}

func (d *DB) InsertGuildBan(guildID, userID, bannedBy, reason string) error {
	_, err := d.Exec(`INSERT INTO guild_bans (guild_id, user_id, banned_by, reason) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, user_id) DO UPDATE SET banned_by=$3, reason=$4, created_at=CURRENT_TIMESTAMP`, guildID, userID, bannedBy, reason)
	return err
}

func (d *DB) DeleteGuildBan(guildID, userID string) error {
	_, err := d.Exec(`DELETE FROM guild_bans WHERE guild_id=$1 AND user_id=$2`, guildID, userID)
	return err
}

func (d *DB) IsGuildBanned(guildID, userID string) bool {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM guild_bans WHERE guild_id=$1 AND user_id=$2`, guildID, userID).Scan(&c)
	return c > 0
}

func (d *DB) ListGuildBans(guildID string) ([]GuildBanRow, error) {
	rows, err := d.Query(`SELECT guild_id, user_id, banned_by, reason, created_at FROM guild_bans WHERE guild_id=$1 ORDER BY created_at DESC`, guildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildBanRow
	for rows.Next() {
		var b GuildBanRow
		if rows.Scan(&b.GuildID, &b.UserID, &b.BannedBy, &b.Reason, &b.CreatedAt) == nil {
			out = append(out, b)
		}
	}
	return out, nil
}

func (d *DB) CountGuildBans(guildID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM guild_bans WHERE guild_id=$1`, guildID).Scan(&c)
	return c
}