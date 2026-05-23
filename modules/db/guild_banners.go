package db

type GuildBannerRow struct {
	ID       string
	GuildID  string
	MimeType string
	Size     int64
	Crop     string
}

func (d *DB) InsertGuildBanner(id, guildID, encMime string, size int64, crop string) error {
	_, err := d.Exec(`INSERT INTO guild_banners (id, guild_id, mime_type, size, crop) VALUES ($1, $2, $3, $4, $5)`, id, guildID, encMime, size, crop)
	return err
}

func (d *DB) GetGuildBannerMeta(bannerID string) (guildID, encMime, crop string, err error) {
	err = d.QueryRow(`SELECT guild_id, mime_type, crop FROM guild_banners WHERE id = $1`, bannerID).Scan(&guildID, &encMime, &crop)
	return
}

func (d *DB) GetGuildBannerByGuild(guildID string) string {
	var id string
	d.QueryRow(`SELECT id FROM guild_banners WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 1`, guildID).Scan(&id)
	return id
}

func (d *DB) DeleteGuildBannersByGuild(guildID string) {
	d.Exec(`DELETE FROM guild_banners WHERE guild_id = $1`, guildID)
}

func (d *DB) UpdateGuildBanner(id, banner, crop string) error {
	_, err := d.Exec(`UPDATE guilds SET banner = $1, banner_crop = $2 WHERE id = $3`, banner, crop, id)
	return err
}