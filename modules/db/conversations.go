package db

func (d *DB) GetConversation(u1, u2 string) (id, user1, user2, createdAt string, err error) {
	err = d.QueryRow(`SELECT id, user1_id, user2_id, created_at FROM dm_conversations WHERE user1_id = $1 AND user2_id = $2`, u1, u2).Scan(&id, &user1, &user2, &createdAt)
	return
}

func (d *DB) GetConversationByID(convID string) (id, user1, user2, createdAt string, err error) {
	err = d.QueryRow(`SELECT id, user1_id, user2_id, created_at FROM dm_conversations WHERE id = $1`, convID).Scan(&id, &user1, &user2, &createdAt)
	return
}

func (d *DB) InsertConversation(id, u1, u2, createdAt string) error {
	_, err := d.Exec(`INSERT INTO dm_conversations (id, user1_id, user2_id, created_at) VALUES ($1, $2, $3, $4)`, id, u1, u2, createdAt)
	return err
}

func (d *DB) ListConversations(userID string) ([][4]string, error) {
	rows, err := d.Query(`SELECT c.id, c.user1_id, c.user2_id, c.created_at FROM dm_conversations c LEFT JOIN (SELECT channel_id, MAX(created_at) AS last_msg FROM messages GROUP BY channel_id) m ON m.channel_id = c.id WHERE (c.user1_id = $1 AND c.closed_by_user1 = false) OR (c.user2_id = $2 AND c.closed_by_user2 = false) ORDER BY COALESCE(m.last_msg, c.created_at) DESC`, userID, userID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out [][4]string
	for rows.Next() {
		var r [4]string
		if rows.Scan(&r[0], &r[1], &r[2], &r[3]) == nil { out = append(out, r) }
	}
	return out, nil
}

func (d *DB) IsParticipant(userID, convID string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM dm_conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $3)`, convID, userID, userID).Scan(&count)
	return count > 0
}

func (d *DB) CountConversations(userID string) int {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM dm_conversations WHERE user1_id = $1 OR user2_id = $2`, userID, userID).Scan(&count)
	return count
}

func (d *DB) IsDMChannel(channelID string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM dm_conversations WHERE id = $1`, channelID).Scan(&count)
	return count > 0
}

func (d *DB) ConversationExists(u1, u2 string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM dm_conversations WHERE user1_id = $1 AND user2_id = $2`, u1, u2).Scan(&count)
	return count > 0
}

func (d *DB) CloseConversation(convID, userID string) error {
	_, err := d.Exec(`UPDATE dm_conversations SET closed_by_user1 = CASE WHEN user1_id = $2 THEN true ELSE closed_by_user1 END, closed_by_user2 = CASE WHEN user2_id = $2 THEN true ELSE closed_by_user2 END WHERE id = $1`, convID, userID)
	return err
}

func (d *DB) ReopenConversation(convID, userID string) (bool, error) {
	res, err := d.Exec(`UPDATE dm_conversations SET closed_by_user1 = CASE WHEN user1_id = $2 THEN false ELSE closed_by_user1 END, closed_by_user2 = CASE WHEN user2_id = $2 THEN false ELSE closed_by_user2 END WHERE id = $1 AND ((user1_id = $2 AND closed_by_user1 = true) OR (user2_id = $2 AND closed_by_user2 = true))`, convID, userID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}