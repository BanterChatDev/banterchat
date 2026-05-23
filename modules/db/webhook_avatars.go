package db

func (d *DB) InsertWebhookAvatar(id, webhookID, encMime string, size int64) error {
	_, err := d.Exec(`INSERT INTO webhook_avatars (id, webhook_id, mime_type, size) VALUES ($1, $2, $3, $4)`, id, webhookID, encMime, size)
	return err
}

func (d *DB) GetWebhookAvatarByWebhook(webhookID string) string {
	var aid string
	d.QueryRow(`SELECT id FROM webhook_avatars WHERE webhook_id = $1`, webhookID).Scan(&aid)
	return aid
}

func (d *DB) GetWebhookAvatarMeta(avatarID string) (webhookID, encMime string, err error) {
	err = d.QueryRow(`SELECT webhook_id, mime_type FROM webhook_avatars WHERE id = $1`, avatarID).Scan(&webhookID, &encMime)
	return
}

func (d *DB) DeleteWebhookAvatarsByWebhook(webhookID string) {
	d.Exec(`DELETE FROM webhook_avatars WHERE webhook_id = $1`, webhookID)
}