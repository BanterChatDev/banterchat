package db

import "fmt"

func (d *DB) InsertAvatar(id, userID, encMime string, size int64) error {
	_, err := d.Exec(`INSERT INTO avatars (id, user_id, mime_type, size) VALUES ($1, $2, $3, $4)`, id, userID, encMime, size)
	return err
}

func (d *DB) GetAvatarMeta(avatarID string) (userID, encMime string, err error) {
	err = d.QueryRow(`SELECT user_id, mime_type FROM avatars WHERE id = $1`, avatarID).Scan(&userID, &encMime)
	return
}

func (d *DB) GetAvatarByUser(userID string) string {
	var id string
	d.QueryRow(`SELECT id FROM avatars WHERE user_id = $1`, userID).Scan(&id)
	return id
}

func (d *DB) GetAvatarsByUsersBatch(userIDs []string) map[string]string {
	if len(userIDs) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(userIDs))
	uniq := make([]string, 0, len(userIDs))
	for _, id := range userIDs {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniq = append(uniq, id)
	}
	if len(uniq) == 0 {
		return nil
	}
	ph := make([]string, len(uniq))
	args := make([]interface{}, len(uniq))
	for i, id := range uniq {
		ph[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	rows, err := d.Query(`SELECT user_id, id FROM avatars WHERE user_id IN (`+joinComma(ph)+`)`, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make(map[string]string, len(uniq))
	for rows.Next() {
		var uid, aid string
		if rows.Scan(&uid, &aid) == nil {
			out[uid] = aid
		}
	}
	return out
}

func (d *DB) DeleteAvatarsByUser(userID string) {
	d.Exec(`DELETE FROM avatars WHERE user_id = $1`, userID)
}