package messages

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/channels/:id/messages", Handler: s.List, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/channels/:id/messages", Handler: s.List},
		{Method: "POST", Path: "/channels/:id/messages/purge", Handler: s.PurgeHandler, Perm: permissions.PermManageMessages},
	}
}