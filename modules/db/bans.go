package db

import "time"

type BanRow struct {
	UserID    string
	BannedBy  string
	Reason    string
	CreatedAt time.Time
}

func (d *DB) IsIPBanned(ip string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM ip_bans WHERE ip = $1`, ip).Scan(&count)
	return count > 0
}

func (d *DB) IsUserBanned(userID string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM bans WHERE user_id = $1`, userID).Scan(&count)
	return count > 0
}

func (d *DB) InsertBan(userID, bannedBy, reason string) error {
	_, err := d.Exec(`INSERT INTO bans (user_id, banned_by, reason) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, userID, bannedBy, reason)
	return err
}

func (d *DB) GetUserLastIP(userID string) string {
	var ip string
	d.QueryRow(`SELECT last_login_ip FROM users WHERE id = $1`, userID).Scan(&ip)
	return ip
}

func (d *DB) InsertIPBan(ip, userID string) {
	d.Exec(`INSERT INTO ip_bans (ip, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, ip, userID)
}

func (d *DB) DeleteIPBansByUser(userID string) {
	d.Exec(`DELETE FROM ip_bans WHERE user_id = $1`, userID)
}

func (d *DB) DeleteBansByUser(userID string) {
	d.Exec(`DELETE FROM bans WHERE user_id = $1`, userID)
}

func (d *DB) CountBannedUsers() int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM bans`).Scan(&c)
	return c
}

func (d *DB) ListBans() ([]BanRow, error) {
	rows, err := d.Query(`SELECT user_id, banned_by, reason, created_at FROM bans ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []BanRow
	for rows.Next() {
		var b BanRow
		if rows.Scan(&b.UserID, &b.BannedBy, &b.Reason, &b.CreatedAt) == nil {
			out = append(out, b)
		}
	}
	return out, nil
}

func (d *DB) GetUserBan(userID string) *BanRow {
	var b BanRow
	err := d.QueryRow(`SELECT user_id, banned_by, reason, created_at FROM bans WHERE user_id = $1`, userID).
		Scan(&b.UserID, &b.BannedBy, &b.Reason, &b.CreatedAt)
	if err != nil {
		return nil
	}
	return &b
}