package db

func (d *DB) GetUserPresenceStatus(userID string) string {
	var s string
	err := d.QueryRow(`SELECT presence_status FROM users WHERE id = $1`, userID).Scan(&s)
	if err != nil || s == "" {
		return "online"
	}
	return s
}

func (d *DB) UpdateUserPresenceStatus(userID, status string) error {
	_, err := d.Exec(`UPDATE users SET presence_status = $1 WHERE id = $2`, status, userID)
	return err
}