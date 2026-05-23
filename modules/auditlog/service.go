package auditlog

import (
	"time"

	"ror/modules/db"
)

const (
	TargetUser     = "user"
	TargetGuild    = "guild"
	TargetChannel  = "channel"
	TargetCategory = "category"
	TargetRole     = "role"
	TargetMessage  = "message"
	TargetWebhook  = "webhook"
	TargetVanity   = "vanity"
	TargetWarning  = "warning"
	TargetSystem   = "system"
	TargetReport   = "report"
)

type Service struct {
	db          *db.DB
	HydrateUser func(userID string) map[string]any
}

func NewService(d *db.DB) *Service {
	return &Service{db: d}
}

type Entry struct {
	ID         string         `json:"id"`
	GuildID    string         `json:"guild_id"`
	ActorID    string         `json:"actor_id"`
	Actor      map[string]any `json:"actor,omitempty"`
	TargetType string         `json:"target_type"`
	TargetID   string         `json:"target_id"`
	TargetUser map[string]any `json:"target_user,omitempty"`
	Action     string         `json:"action"`
	Reason     string         `json:"reason"`
	Metadata   map[string]any `json:"metadata"`
	IsSite     bool           `json:"is_site"`
	CreatedAt  time.Time      `json:"created_at"`
}