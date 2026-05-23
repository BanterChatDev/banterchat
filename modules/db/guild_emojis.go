package db

import (
	"database/sql"
	"time"

	"github.com/lib/pq"
)

type GuildEmojiRow struct {
	ID        string
	GuildID   sql.NullString
	Name      string
	MimeEnc   string
	Size      int64
	Animated  bool
	Category  string
	CreatedBy sql.NullString
	CreatedAt time.Time
}

func (d *DB) InsertGuildEmoji(id, guildID, name, mimeEnc string, size int64, animated bool, createdBy string) error {
	_, err := d.Exec(`INSERT INTO guild_emojis (id, guild_id, name, mime_enc, size, animated, category, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		id, guildID, name, mimeEnc, size, animated, "", createdBy, time.Now().UTC())
	return err
}

func (d *DB) UpsertDefaultEmoji(id, name, mime string, size int64, animated bool, category string) error {
	_, err := d.Exec(`INSERT INTO guild_emojis (id, guild_id, name, mime_enc, size, animated, category, created_by, created_at)
		VALUES ($1, NULL, $2, $3, $4, $5, $6, NULL, $7)
		ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, mime_enc = EXCLUDED.mime_enc, size = EXCLUDED.size, animated = EXCLUDED.animated, category = EXCLUDED.category`,
		id, name, mime, size, animated, category, time.Now().UTC())
	return err
}

func (d *DB) GetGuildEmoji(id string) (*GuildEmojiRow, error) {
	row := d.QueryRow(`SELECT id, guild_id, name, mime_enc, size, animated, category, created_by, created_at
		FROM guild_emojis WHERE id = $1`, id)
	var e GuildEmojiRow
	if err := row.Scan(&e.ID, &e.GuildID, &e.Name, &e.MimeEnc, &e.Size, &e.Animated, &e.Category, &e.CreatedBy, &e.CreatedAt); err != nil {
		return nil, err
	}
	return &e, nil
}

func (d *DB) IsEmojiAllowedInGuild(emojiID, guildID string) bool {
	if emojiID == "" {
		return false
	}
	var emojiGuildID sql.NullString
	if err := d.QueryRow(`SELECT guild_id FROM guild_emojis WHERE id = $1`, emojiID).Scan(&emojiGuildID); err != nil {
		return false
	}
	if !emojiGuildID.Valid {
		return true
	}
	if guildID == "" {
		return false
	}
	return emojiGuildID.String == guildID
}

func (d *DB) ListGuildEmojis(guildID string) ([]GuildEmojiRow, error) {
	rows, err := d.Query(`SELECT id, guild_id, name, mime_enc, size, animated, category, created_by, created_at
		FROM guild_emojis WHERE guild_id = $1 ORDER BY name ASC`, guildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildEmojiRow
	for rows.Next() {
		var e GuildEmojiRow
		if rows.Scan(&e.ID, &e.GuildID, &e.Name, &e.MimeEnc, &e.Size, &e.Animated, &e.Category, &e.CreatedBy, &e.CreatedAt) == nil {
			out = append(out, e)
		}
	}
	return out, nil
}

func (d *DB) ListDefaultEmojis() ([]GuildEmojiRow, error) {
	rows, err := d.Query(`SELECT id, guild_id, name, mime_enc, size, animated, category, created_by, created_at
		FROM guild_emojis WHERE guild_id IS NULL ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GuildEmojiRow
	for rows.Next() {
		var e GuildEmojiRow
		if rows.Scan(&e.ID, &e.GuildID, &e.Name, &e.MimeEnc, &e.Size, &e.Animated, &e.Category, &e.CreatedBy, &e.CreatedAt) == nil {
			out = append(out, e)
		}
	}
	return out, nil
}

func (d *DB) CountGuildEmojis(guildID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM guild_emojis WHERE guild_id = $1`, guildID).Scan(&c)
	return c
}

func (d *DB) DeleteGuildEmoji(id string) error {
	_, err := d.Exec(`DELETE FROM guild_emojis WHERE id = $1`, id)
	return err
}

func (d *DB) DeleteDefaultEmojisExcept(keepIDs []string) (int64, error) {
	if len(keepIDs) == 0 {
		res, err := d.Exec(`DELETE FROM guild_emojis WHERE guild_id IS NULL`)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		return n, nil
	}
	res, err := d.Exec(`DELETE FROM guild_emojis WHERE guild_id IS NULL AND id <> ALL($1)`, pq.Array(keepIDs))
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return n, nil
}

func (d *DB) GuildEmojiNameTaken(guildID, name string) bool {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM guild_emojis WHERE guild_id = $1 AND name = $2`, guildID, name).Scan(&c)
	return c > 0
}

func (d *DB) GuildEmojiNameTakenExcluding(guildID, name, excludeID string) bool {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM guild_emojis WHERE guild_id = $1 AND name = $2 AND id != $3`, guildID, name, excludeID).Scan(&c)
	return c > 0
}

func (d *DB) UpdateGuildEmojiName(id, name string) error {
	_, err := d.Exec(`UPDATE guild_emojis SET name = $1 WHERE id = $2`, name, id)
	return err
}