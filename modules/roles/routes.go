package roles

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId/roles", Handler: s.List, Auth: true},
		{Method: "GET", Path: "/roles/:id", Handler: s.Get, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/roles", Handler: s.Create, CSRF: true, Auth: true, Perm: permissions.PermManageRoles},
		{Method: "PUT", Path: "/roles/:id", Handler: s.Update, CSRF: true, Auth: true, Perm: permissions.PermManageRoles},
		{Method: "DELETE", Path: "/roles/:id", Handler: s.Delete, CSRF: true, Auth: true, Perm: permissions.PermManageRoles},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId/roles", Handler: s.List},
		{Method: "GET", Path: "/roles/:id", Handler: s.Get},
		{Method: "POST", Path: "/guilds/:guildId/roles", Handler: s.Create, Perm: permissions.PermManageRoles},
		{Method: "PUT", Path: "/roles/:id", Handler: s.Update, Perm: permissions.PermManageRoles},
		{Method: "DELETE", Path: "/roles/:id", Handler: s.Delete, Perm: permissions.PermManageRoles},
	}
}