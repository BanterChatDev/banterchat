package db

import "time"

type SiteAdminRow struct {
	UserID     string
	PromotedBy string
	PromotedAt time.Time
	Note       string
}

func (d *DB) AddSiteAdmin(userID, promotedBy, note string) error {
	_, err := d.Exec(`INSERT INTO site_admins (user_id, promoted_by, note) VALUES ($1, NULLIF($2, ''), $3) ON CONFLICT (user_id) DO UPDATE SET promoted_by = EXCLUDED.promoted_by, promoted_at = CURRENT_TIMESTAMP, note = EXCLUDED.note`, userID, promotedBy, note)
	return err
}

func (d *DB) RemoveSiteAdmin(userID string) error {
	_, err := d.Exec(`DELETE FROM site_admins WHERE user_id = $1`, userID)
	return err
}

func (d *DB) IsDBSiteAdmin(userID string) bool {
	var n int
	d.QueryRow(`SELECT COUNT(*) FROM site_admins WHERE user_id = $1`, userID).Scan(&n)
	return n > 0
}

func (d *DB) ListSiteAdmins() ([]SiteAdminRow, error) {
	rows, err := d.Query(`SELECT user_id, COALESCE(promoted_by, ''), promoted_at, note FROM site_admins ORDER BY promoted_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SiteAdminRow
	for rows.Next() {
		var r SiteAdminRow
		if rows.Scan(&r.UserID, &r.PromotedBy, &r.PromotedAt, &r.Note) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}