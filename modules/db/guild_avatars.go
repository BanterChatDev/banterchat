package db

type GuildAvatarRow struct {
	ID       string
	GuildID  string
	MimeType string
	Size     int64
}

func (d *DB) InsertGuildAvatar(id, guildID, encMime string, size int64) error {
	_, err := d.Exec(`INSERT INTO guild_avatars (id, guild_id, mime_type, size) VALUES ($1, $2, $3, $4)`, id, guildID, encMime, size)
	return err
}

func (d *DB) GetGuildAvatarMeta(avatarID string) (guildID, encMime string, err error) {
	err = d.QueryRow(`SELECT guild_id, mime_type FROM guild_avatars WHERE id = $1`, avatarID).Scan(&guildID, &encMime)
	return
}

func (d *DB) GetGuildAvatarByGuild(guildID string) string {
	var id string
	d.QueryRow(`SELECT id FROM guild_avatars WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 1`, guildID).Scan(&id)
	return id
}

func (d *DB) DeleteGuildAvatarsByGuild(guildID string) {
	d.Exec(`DELETE FROM guild_avatars WHERE guild_id = $1`, guildID)
}