package invites

import (
	"html/template"
	"time"

	"ror/modules/auditlog"
	"ror/modules/auth"
	"ror/modules/db"
	"ror/modules/websocket"
)

// Service owns all invite-related HTTP endpoints, the HTML invite-unfurl page,
// and the shared preview resolution logic. It depends on a few callbacks into
// the guilds package rather than importing it directly, to keep the dependency
// one-way and the testing surface thin.
type Service struct {
	db    *db.DB
	hub   *websocket.Hub
	cfg   Config
	auth  *auth.Service
	audit *auditlog.Service

	// Callbacks injected by main.go so we don't couple this package to guilds.
	DecryptGuild    func(row *db.GuildRow) GuildInfo
	CanManageGuild  func(userID string, row *db.GuildRow) bool
	BuildMember     func(guildID, userID string) map[string]interface{}

	invitePageTemplate *template.Template
}

// GuildInfo is the decrypted guild shape we need for invite rendering.
// Mirrors the fields the guilds package exposes via its Guild type, but
// defined here to avoid an import cycle.
type GuildInfo struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Icon        string    `json:"icon"`
	Banner      string    `json:"banner"`
	BannerCrop  string    `json:"banner_crop"`
	Description string    `json:"description"`
	OwnerID     string    `json:"owner_id"`
	MemberCount int       `json:"member_count"`
	OnlineCount int       `json:"online_count"`
	CreatedAt   time.Time `json:"created_at"`
}

func NewService(db *db.DB, hub *websocket.Hub, cfg Config, authSvc *auth.Service, audit *auditlog.Service) *Service {
	return &Service{db: db, hub: hub, cfg: cfg, auth: authSvc, audit: audit}
}

func (s *Service) InvitePageTemplate() *template.Template {
	return s.invitePageTemplate
}

func (s *Service) SetInvitePageTemplate(t *template.Template) {
	s.invitePageTemplate = t
}