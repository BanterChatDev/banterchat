package threads

import (
	"ror/modules/auditlog"
	"ror/modules/channels"
	"ror/modules/db"
	"ror/modules/permissions"
	"ror/modules/websocket"
)

type Service struct {
	db          *db.DB
	hub         *websocket.Hub
	channelsCfg channels.Config
	masterKey   string
	audit       *auditlog.Service
}

func NewService(db *db.DB, hub *websocket.Hub, channelsCfg channels.Config, masterKey string, audit *auditlog.Service) *Service {
	return &Service{db: db, hub: hub, channelsCfg: channelsCfg, masterKey: masterKey, audit: audit}
}

func (s *Service) canManageParent(userID, parentChannelID string) bool {
	perms := permissions.ResolveChannelPerms(s.db, userID, parentChannelID)
	return permissions.HasPerm(perms, permissions.PermManageChannels)
}

func (s *Service) canCreateInParent(userID, parentChannelID string) bool {
	perms := permissions.ResolveChannelPerms(s.db, userID, parentChannelID)
	return permissions.HasPerm(perms, permissions.PermCreatePublicThreads)
}

func (s *Service) canViewParent(userID, parentChannelID string) bool {
	perms := permissions.ResolveChannelPerms(s.db, userID, parentChannelID)
	return permissions.HasPerm(perms, permissions.PermViewChannels)
}