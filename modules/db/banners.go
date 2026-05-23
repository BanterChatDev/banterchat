package db

func (d *DB) InsertBanner(id, userID, encMime string, size int64, crop string) error {
	_, err := d.Exec(`INSERT INTO banners (id, user_id, mime_type, size, crop) VALUES ($1, $2, $3, $4, $5)`, id, userID, encMime, size, crop)
	return err
}

func (d *DB) GetBannerMeta(bannerID string) (userID, encMime string, err error) {
	err = d.QueryRow(`SELECT user_id, mime_type FROM banners WHERE id = $1`, bannerID).Scan(&userID, &encMime)
	return
}

func (d *DB) GetBannerByUser(userID string) string {
	var id string
	d.QueryRow(`SELECT id FROM banners WHERE user_id = $1`, userID).Scan(&id)
	return id
}

func (d *DB) GetBannerCropByUser(userID string) string {
	var crop string
	d.QueryRow(`SELECT COALESCE(crop, '') FROM banners WHERE user_id = $1`, userID).Scan(&crop)
	return crop
}

func (d *DB) DeleteBannersByUser(userID string) {
	d.Exec(`DELETE FROM banners WHERE user_id = $1`, userID)
}