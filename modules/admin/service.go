package admin

import (
	"strconv"

	"ror/modules/auditlog"
	"ror/modules/bots"
	"ror/modules/db"
	"ror/modules/guilds"
	"ror/modules/users"
	"ror/modules/websocket"
)

type Service struct {
	db                 *db.DB
	users              *users.Service
	guilds             *guilds.Service
	hub                *websocket.Hub
	audit              *auditlog.Service
	bots               *bots.Service
	CountOnlineInGuild func(guildID string) int
}

func NewService(dbConn *db.DB, usersSvc *users.Service, guildsSvc *guilds.Service, hub *websocket.Hub, audit *auditlog.Service, botsSvc *bots.Service) *Service {
	return &Service{db: dbConn, users: usersSvc, guilds: guildsSvc, hub: hub, audit: audit, bots: botsSvc}
}

func (s *Service) onlineInGuild(guildID string) int {
	if s.CountOnlineInGuild == nil {
		return 0
	}
	return s.CountOnlineInGuild(guildID)
}

func parseInt(s string, def, min, max int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}