package db

func (d *DB) GetUserFlair(userID string) string {
	var f string
	d.QueryRow(`SELECT flair FROM users WHERE id = $1`, userID).Scan(&f)
	return f
}

func (d *DB) SetUserFlair(userID, flairID string) error {
	_, err := d.Exec(`UPDATE users SET flair = $1 WHERE id = $2`, flairID, userID)
	return err
}