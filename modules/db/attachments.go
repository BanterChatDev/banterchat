package db

import (
	"fmt"
	"strings"
)

func (d *DB) InsertAttachment(id, guildID, channelID, userID, filename, mimeType string, size int64, width, height int, fileHash string, refCount int, storagePath, filePreview string, flags int64, durationSecs float64, waveform string) error {
	_, err := d.Exec(`INSERT INTO attachments (id, guild_id, channel_id, user_id, filename, mime_type, size, width, height, file_hash, ref_count, storage_path, file_preview, flags, duration_secs, waveform) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, id, guildID, channelID, userID, filename, mimeType, size, width, height, fileHash, refCount, storagePath, filePreview, flags, durationSecs, waveform)
	return err
}

func (d *DB) GetAttachment(id string) (channelID, filename, mimeType string, size int64, storagePath string, err error) {
	err = d.QueryRow(`SELECT channel_id, filename, mime_type, size, storage_path FROM attachments WHERE id = $1`, id).Scan(&channelID, &filename, &mimeType, &size, &storagePath)
	return
}

func (d *DB) GetAttachmentOwner(id string) string {
	var uid string
	d.QueryRow(`SELECT user_id FROM attachments WHERE id = $1`, id).Scan(&uid)
	return uid
}

func (d *DB) LinkAttachmentToMessage(attID, messageID string) {
	d.Exec(`UPDATE attachments SET message_id = $1 WHERE id = $2`, messageID, attID)
}

type AttachmentMiniRow struct {
	ID           string  `json:"id"`
	Filename     string  `json:"filename"`
	MimeType     string  `json:"mime_type"`
	Size         int64   `json:"size"`
	Width        int     `json:"width,omitempty"`
	Height       int     `json:"height,omitempty"`
	FilePreview  string  `json:"file_preview,omitempty"`
	Flags        int64   `json:"flags,omitempty"`
	DurationSecs float64 `json:"duration_secs,omitempty"`
	Waveform     string  `json:"waveform,omitempty"`
}

func (d *DB) GetAttachmentsByMessage(messageID string) ([]AttachmentMiniRow, error) {
	rows, err := d.Query(`SELECT id, filename, mime_type, size, width, height, file_preview, flags, duration_secs, waveform FROM attachments WHERE message_id = $1`, messageID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []AttachmentMiniRow
	for rows.Next() {
		var a AttachmentMiniRow
		if rows.Scan(&a.ID, &a.Filename, &a.MimeType, &a.Size, &a.Width, &a.Height, &a.FilePreview, &a.Flags, &a.DurationSecs, &a.Waveform) == nil { out = append(out, a) }
	}
	return out, nil
}

type AttachmentMasterRow struct {
	ID           string
	StoragePath  string
	Width        int
	Height       int
	FilePreview  string
	Flags        int64
	DurationSecs float64
	Waveform     string
}

func (d *DB) FindAttachmentByHash(fileHash string) (id, storagePath string, err error) {
	err = d.QueryRow(`SELECT id, storage_path FROM attachments WHERE file_hash = $1 AND ref_count > 0 LIMIT 1`, fileHash).Scan(&id, &storagePath)
	return
}

func (d *DB) FindAttachmentMasterByHash(fileHash string) (*AttachmentMasterRow, error) {
	var m AttachmentMasterRow
	err := d.QueryRow(`SELECT id, storage_path, width, height, file_preview, flags, duration_secs, waveform FROM attachments WHERE file_hash = $1 AND ref_count > 0 LIMIT 1`, fileHash).Scan(&m.ID, &m.StoragePath, &m.Width, &m.Height, &m.FilePreview, &m.Flags, &m.DurationSecs, &m.Waveform)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (d *DB) MarkBlobMissing(storagePath string) {
	d.Exec(`UPDATE attachments SET ref_count = 0 WHERE storage_path = $1`, storagePath)
}

func (d *DB) IncrementRefCount(fileHash string) {
	d.Exec(`UPDATE attachments SET ref_count = ref_count + 1 WHERE file_hash = $1 AND ref_count > 0`, fileHash)
}

func (d *DB) DecrementRefCount(fileHash string) (int64, error) {
	res, err := d.Exec(`UPDATE attachments SET ref_count = ref_count - 1 WHERE file_hash = $1 AND ref_count > 0`, fileHash)
	if err != nil { return 0, err }
	return res.RowsAffected()
}

func (d *DB) CountActiveRefs(fileHash string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM attachments WHERE file_hash = $1 AND ref_count > 0`, fileHash).Scan(&c)
	return c
}

type AttachmentRefRow struct {
	ID, FileHash, StoragePath string
}

func (d *DB) CollectAttachmentRefs(column, value string) ([]AttachmentRefRow, error) {
	switch column {
	case "id", "message_id", "channel_id", "guild_id", "user_id":
	default:
		return nil, fmt.Errorf("attachments: invalid filter column %q", column)
	}
	rows, err := d.Query(`SELECT id, file_hash, storage_path FROM attachments WHERE `+column+` = $1`, value)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []AttachmentRefRow
	for rows.Next() {
		var r AttachmentRefRow
		if rows.Scan(&r.ID, &r.FileHash, &r.StoragePath) == nil { out = append(out, r) }
	}
	return out, nil
}

func (d *DB) DeleteAttachmentByID(attID string) {
	d.Exec(`DELETE FROM attachments WHERE id = $1`, attID)
}

func (d *DB) CountAttachmentsByMessage(messageID string) int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM attachments WHERE message_id = $1`, messageID).Scan(&c)
	return c
}

func (d *DB) CountAttachmentsByMessages(messageIDs []string) map[string]int {
	out := map[string]int{}
	if len(messageIDs) == 0 {
		return out
	}
	ph := make([]string, len(messageIDs))
	args := make([]interface{}, len(messageIDs))
	for i, id := range messageIDs {
		ph[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	rows, err := d.Query(`SELECT message_id, COUNT(*) FROM attachments WHERE message_id IN (`+strings.Join(ph, ",")+`) GROUP BY message_id`, args...)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var c int
		if rows.Scan(&id, &c) == nil {
			out[id] = c
		}
	}
	return out
}

func (d *DB) DeleteAttachmentsByMessage(messageID string) {
	d.Exec(`DELETE FROM attachments WHERE message_id = $1`, messageID)
}

func (d *DB) DeleteAttachmentsByChannel(channelID string) {
	d.Exec(`DELETE FROM attachments WHERE channel_id = $1`, channelID)
}

func (d *DB) GetAttachmentsByMessages(messageIDs []string) (map[string][]AttachmentMiniRow, error) {
	if len(messageIDs) == 0 {
		return nil, nil
	}
	ph := make([]string, len(messageIDs))
	args := make([]interface{}, len(messageIDs))
	for i, id := range messageIDs {
		ph[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	rows, err := d.Query(`SELECT id, message_id, filename, mime_type, size, width, height, file_preview, flags, duration_secs, waveform FROM attachments WHERE message_id IN (`+strings.Join(ph, ",")+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string][]AttachmentMiniRow)
	for rows.Next() {
		var a AttachmentMiniRow
		var msgID string
		if rows.Scan(&a.ID, &msgID, &a.Filename, &a.MimeType, &a.Size, &a.Width, &a.Height, &a.FilePreview, &a.Flags, &a.DurationSecs, &a.Waveform) == nil {
			result[msgID] = append(result[msgID], a)
		}
	}
	return result, nil
}