package webhooks

import (
	"crypto/sha256"
	"encoding/hex"
	"time"

	"ror/modules/attachments"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/embed"
	"ror/modules/id"
	"ror/modules/permissions"
	"ror/modules/websocket"
)

type Service struct {
	db        *db.DB
	hub       *websocket.Hub
	audit     *auditlog.Service
	cfg       Config
	attCfg    attachments.Config
	masterKey string
	apiPrefix string

	OnSendMessage     func(channelID, webhookID, name, avatarID, avatarURL, content string, embeds []embed.Embed, tts bool, attachmentIDs []string) (string, error)
	OnStoreAttachment func(channelID, userID, filename, mime string, data []byte) (string, error)
}

func NewService(d *db.DB, hub *websocket.Hub, audit *auditlog.Service, cfg Config, attCfg attachments.Config, masterKey, apiPrefix string) *Service {
	return &Service{db: d, hub: hub, audit: audit, cfg: cfg, attCfg: attCfg, masterKey: masterKey, apiPrefix: apiPrefix}
}

type Webhook struct {
	ID         string     `json:"id"`
	GuildID    string     `json:"guild_id"`
	ChannelID  string     `json:"channel_id"`
	Name       string     `json:"name"`
	AvatarID   string     `json:"avatar_id"`
	CreatedBy  string     `json:"created_by"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
	UseCount   int64      `json:"use_count"`
	Disabled   bool       `json:"disabled"`
	URL        string     `json:"url,omitempty"`
}

func (s *Service) canManage(userID, channelID string) bool {
	perms := permissions.ResolveChannelPerms(s.db, userID, channelID)
	return permissions.HasPerm(perms, permissions.PermManageWebhooks)
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func generateToken() string {
	return id.Generate() + id.Generate()
}

func (s *Service) webhookURL(id, token string) string {
	return s.apiPrefix + "/webhooks/" + id + "/" + token
}