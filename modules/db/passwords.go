package db

func (d *DB) UpdateUserPassword(userID, passwordHash string) error {
	_, err := d.Exec(`UPDATE users SET password_hash = $1 WHERE id = $2`, passwordHash, userID)
	return err
}

func (d *DB) DeleteUserSessionsExcept(userID, keepSessionID string) {
	d.Exec(`DELETE FROM sessions WHERE user_id = $1 AND id != $2`, userID, keepSessionID)
}

func (d *DB) DeleteAllUserSessions(userID string) {
	d.Exec(`DELETE FROM sessions WHERE user_id = $1`, userID)
}