package db

import (
	"time"
)

type SuspensionInfo struct {
	Reason string
	Until  *time.Time
}

func (d *DB) GetSuspension(userID string) (SuspensionInfo, bool) {
	var info SuspensionInfo
	var suspended bool
	err := d.QueryRow(`SELECT suspended, suspended_reason, suspended_until FROM users WHERE id = $1`, userID).
		Scan(&suspended, &info.Reason, &info.Until)
	if err != nil || !suspended {
		return info, false
	}
	return info, true
}

func (d *DB) IsUserSuspended(userID string) bool {
	_, ok := d.GetSuspension(userID)
	return ok
}

func (d *DB) SuspendUser(userID, reason string, until *time.Time) error {
	_, err := d.Exec(`UPDATE users SET suspended = true, suspended_reason = $1, suspended_until = $2 WHERE id = $3`, reason, until, userID)
	return err
}

func (d *DB) UnsuspendUser(userID string) error {
	_, err := d.Exec(`UPDATE users SET suspended = false, suspended_reason = '', suspended_until = NULL WHERE id = $1`, userID)
	return err
}

func (d *DB) DeleteUserByID(userID string) error {
	_, err := d.Exec(`DELETE FROM users WHERE id = $1`, userID)
	return err
}

func (d *DB) SuspendGuild(guildID, reason string) error {
	_, err := d.Exec(`UPDATE guilds SET suspended = true, suspended_reason = $1, suspended_at = CURRENT_TIMESTAMP WHERE id = $2`, reason, guildID)
	return err
}

func (d *DB) UnsuspendGuild(guildID string) error {
	_, err := d.Exec(`UPDATE guilds SET suspended = false, suspended_reason = '', suspended_at = NULL WHERE id = $1`, guildID)
	return err
}