package channels

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId/channels", Handler: s.List, Auth: true},
		{Method: "GET", Path: "/channels/:id", Handler: s.Get, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/channels", Handler: s.Create, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "POST", Path: "/channels/:id/duplicate", Handler: s.Duplicate, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/guilds/:guildId/channels/reorder", Handler: s.Reorder, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/channels/:id", Handler: s.Update, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "DELETE", Path: "/channels/:id", Handler: s.Delete, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "GET", Path: "/channels/:id/permissions", Handler: s.GetPerms, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/channels/:id/permissions", Handler: s.SetPerm, CSRF: true, Auth: true, Perm: permissions.PermManageChannels},
		{Method: "GET", Path: "/channels/:id/permissions/me", Handler: s.ResolvePerms, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId/channels", Handler: s.List},
		{Method: "GET", Path: "/channels/:id", Handler: s.Get},
		{Method: "POST", Path: "/guilds/:guildId/channels", Handler: s.Create, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/guilds/:guildId/channels/reorder", Handler: s.Reorder, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/channels/:id", Handler: s.Update, Perm: permissions.PermManageChannels},
		{Method: "DELETE", Path: "/channels/:id", Handler: s.Delete, Perm: permissions.PermManageChannels},
		{Method: "GET", Path: "/channels/:id/permissions", Handler: s.GetPerms, Perm: permissions.PermManageChannels},
		{Method: "PUT", Path: "/channels/:id/permissions", Handler: s.SetPerm, Perm: permissions.PermManageChannels},
	}
}