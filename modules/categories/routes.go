package categories

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId/categories", Handler: s.List, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/categories", Handler: s.Create, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/guilds/:guildId/categories/reorder", Handler: s.Reorder, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/categories/:id", Handler: s.Update, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "DELETE", Path: "/categories/:id", Handler: s.Delete, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "GET", Path: "/categories/:id/permissions", Handler: s.GetPerms, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/categories/:id/permissions", Handler: s.SetPerm, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId/categories", Handler: s.List},
		{Method: "POST", Path: "/guilds/:guildId/categories", Handler: s.Create, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/guilds/:guildId/categories/reorder", Handler: s.Reorder, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/categories/:id", Handler: s.Update, Perm: permissions.PermManageChannels},
		{Method: "DELETE", Path: "/categories/:id", Handler: s.Delete, Perm: permissions.PermManageChannels},
		{Method: "GET", Path: "/categories/:id/permissions", Handler: s.GetPerms, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/categories/:id/permissions", Handler: s.SetPerm, Perm: permissions.PermManageChannels},
	}
}