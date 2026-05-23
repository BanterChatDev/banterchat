package webhooks

import (
	"database/sql"
	"time"

	"ror/modules/encryption"
)

func (s *Service) getWebhookGuildChannel(wid string) (guildID, channelID string, ok bool) {
	if err := s.db.QueryRow(`SELECT guild_id, channel_id FROM webhooks WHERE id = $1`, wid).Scan(&guildID, &channelID); err != nil {
		return "", "", false
	}
	return guildID, channelID, true
}

type executeRow struct {
	HookID, ChannelID, Name, AvatarID, StoredHash, CreatedBy string
	Disabled                                                 bool
}

func (s *Service) getWebhookForExecute(wid string) (executeRow, bool) {
	var r executeRow
	err := s.db.QueryRow(`SELECT id, channel_id, name, avatar_id, token_hash, disabled, created_by FROM webhooks WHERE id = $1`, wid).
		Scan(&r.HookID, &r.ChannelID, &r.Name, &r.AvatarID, &r.StoredHash, &r.Disabled, &r.CreatedBy)
	if err != nil {
		return r, false
	}
	return r, true
}

func (s *Service) listByChannel(channelID string) ([]Webhook, error) {
	rows, err := s.db.Query(`SELECT id, guild_id, channel_id, name, avatar_id, created_by, created_at, last_used_at, use_count, disabled, COALESCE(token_enc,'')
		FROM webhooks WHERE channel_id = $1 ORDER BY created_at DESC`, channelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanWebhooks(rows), nil
}

func (s *Service) listByGuild(guildID string) ([]Webhook, error) {
	rows, err := s.db.Query(`SELECT id, guild_id, channel_id, name, avatar_id, created_by, created_at, last_used_at, use_count, disabled, COALESCE(token_enc,'')
		FROM webhooks WHERE guild_id = $1 ORDER BY created_at DESC`, guildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanWebhooks(rows), nil
}

func (s *Service) scanWebhooks(rows *sql.Rows) []Webhook {
	out := []Webhook{}
	for rows.Next() {
		var w Webhook
		var lastUsed *time.Time
		var tokenEnc string
		if rows.Scan(&w.ID, &w.GuildID, &w.ChannelID, &w.Name, &w.AvatarID, &w.CreatedBy, &w.CreatedAt, &lastUsed, &w.UseCount, &w.Disabled, &tokenEnc) != nil {
			continue
		}
		w.LastUsedAt = lastUsed
		if tokenEnc != "" {
			if tok := encryption.DecryptField(tokenEnc, s.masterKey); tok != "" {
				w.URL = s.webhookURL(w.ID, tok)
			}
		}
		out = append(out, w)
	}
	return out
}