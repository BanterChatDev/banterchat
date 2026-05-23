package db

import "time"

type SessionRow struct {
	ID        string
	UserID    string
	IP        string
	UserAgent string
	ExpiresAt time.Time
	CreatedAt time.Time
}

func (d *DB) InsertSession(id, userID, ip, userAgent string, expiresAt time.Time) error {
	_, err := d.Exec(`INSERT INTO sessions (id, user_id, ip, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)`, id, userID, ip, userAgent, expiresAt)
	return err
}

func (d *DB) GetSession(sessionID string, now time.Time) (*SessionRow, error) {
	s := &SessionRow{}
	err := d.QueryRow(`SELECT id, user_id, ip, user_agent, expires_at, created_at FROM sessions WHERE id = $1 AND expires_at > $2`, sessionID, now).
		Scan(&s.ID, &s.UserID, &s.IP, &s.UserAgent, &s.ExpiresAt, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (d *DB) DeleteSession(sessionID string) {
	d.Exec(`DELETE FROM sessions WHERE id = $1`, sessionID)
}

func (d *DB) ListUserSessions(userID string, now time.Time) ([]SessionRow, error) {
	rows, err := d.Query(`SELECT id, user_id, ip, user_agent, expires_at, created_at FROM sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC`, userID, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SessionRow
	for rows.Next() {
		var s SessionRow
		if rows.Scan(&s.ID, &s.UserID, &s.IP, &s.UserAgent, &s.ExpiresAt, &s.CreatedAt) == nil {
			out = append(out, s)
		}
	}
	return out, nil
}

func (d *DB) CleanExpiredSessions(now time.Time) {
	d.Exec(`DELETE FROM sessions WHERE expires_at < $1`, now)
}

func (d *DB) DeleteSessionsByUser(userID string) {
	d.Exec(`DELETE FROM sessions WHERE user_id = $1`, userID)
}

func (d *DB) CountRecentRegistrations(ip string, since time.Time) int {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM registration_log WHERE ip = $1 AND created_at > $2`, ip, since).Scan(&count)
	return count
}

func (d *DB) LogRegistration(ip string) {
	d.Exec(`INSERT INTO registration_log (ip) VALUES ($1)`, ip)
}