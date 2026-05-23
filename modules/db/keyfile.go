package db

func (d *DB) SetUserKeyfileHash(userID, hash string) error {
	_, err := d.Exec(`UPDATE users SET keyfile_hash = $1 WHERE id = $2`, hash, userID)
	return err
}

func (d *DB) GetUserKeyfileHash(userID string) string {
	var h string
	d.QueryRow(`SELECT keyfile_hash FROM users WHERE id = $1`, userID).Scan(&h)
	return h
}