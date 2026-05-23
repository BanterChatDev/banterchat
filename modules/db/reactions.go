package db

import (
	"database/sql"
	"fmt"
	"time"
)

func (d *DB) AddReaction(messageID, userID, emojiID string) error {
	_, err := d.Exec(`INSERT INTO reactions (message_id, user_id, emoji_id, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, messageID, userID, emojiID, time.Now().UTC().Format(time.RFC3339))
	return err
}

func (d *DB) RemoveReaction(messageID, userID, emojiID string) error {
	_, err := d.Exec(`DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji_id = $3`, messageID, userID, emojiID)
	return err
}

func (d *DB) CountReaction(messageID, emojiID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM reactions WHERE message_id = $1 AND emoji_id = $2`, messageID, emojiID).Scan(&c)
	return c
}

func (d *DB) CountUniqueReactions(messageID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(DISTINCT emoji_id) FROM reactions WHERE message_id = $1`, messageID).Scan(&c)
	return c
}

func (d *DB) HasReacted(messageID, userID, emojiID string) bool {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji_id = $3`, messageID, userID, emojiID).Scan(&c)
	return c > 0
}

func (d *DB) ListReactionsForMessage(viewerID, messageID string) (*sql.Rows, error) {
	return d.Query(`SELECT r.emoji_id, e.name, COUNT(*) as cnt, MAX(CASE WHEN r.user_id = $1 THEN 1 ELSE 0 END) as me FROM reactions r JOIN guild_emojis e ON e.id = r.emoji_id WHERE r.message_id = $2 GROUP BY r.emoji_id, e.name ORDER BY MIN(r.created_at) ASC`, viewerID, messageID)
}

func (d *DB) ListReactionsForMessages(viewerID string, messageIDs []string) (*sql.Rows, error) {
	if len(messageIDs) == 0 { return nil, nil }
	ph := ""
	args := []interface{}{viewerID}
	for i, id := range messageIDs {
		if i > 0 { ph += "," }
		ph += fmt.Sprintf("$%d", i+2)
		args = append(args, id)
	}
	return d.Query(`SELECT r.message_id, r.emoji_id, e.name, COUNT(*) as cnt, MAX(CASE WHEN r.user_id = $1 THEN 1 ELSE 0 END) as me FROM reactions r JOIN guild_emojis e ON e.id = r.emoji_id WHERE r.message_id IN (`+ph+`) GROUP BY r.message_id, r.emoji_id, e.name ORDER BY MIN(r.created_at) ASC`, args...)
}

func (d *DB) GetReactionUsernames(messageID, emojiID string, limit int) (*sql.Rows, error) {
	return d.Query(`SELECT r.user_id FROM reactions r WHERE r.message_id = $1 AND r.emoji_id = $2 ORDER BY r.created_at ASC LIMIT $3`, messageID, emojiID, limit)
}

func (d *DB) DeleteReactionsByMessage(messageID string) {
	d.Exec(`DELETE FROM reactions WHERE message_id = $1`, messageID)
}