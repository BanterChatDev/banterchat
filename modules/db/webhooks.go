package db

func (d *DB) GetWebhookGuildID(webhookID string) string {
	var gid string
	d.QueryRow(`SELECT COALESCE(guild_id,'') FROM webhooks WHERE id = $1`, webhookID).Scan(&gid)
	return gid
}