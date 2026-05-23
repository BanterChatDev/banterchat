package users

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/me", Handler: s.Me, Auth: true},
		{Method: "PUT", Path: "/me", Handler: s.UpdateUserHandler, CSRF: true, Auth: true},
		{Method: "PUT", Path: "/me/flair", Handler: s.UpdateFlairHandler, CSRF: true, Auth: true},
		{Method: "GET", Path: "/users", Handler: s.ListUsersHandler, Auth: true},
		{Method: "GET", Path: "/users/:id", Handler: s.GetProfile, Auth: true},
		{Method: "GET", Path: "/users/:id/mutuals", Handler: s.GetMutuals, Auth: true},
		{Method: "PUT", Path: "/guilds/:guildId/members/:userId/roles/:roleId", Handler: s.AddGuildMemberRole, CSRF: true, Auth: true, Perm: permissions.PermManageRoles},
		{Method: "DELETE", Path: "/guilds/:guildId/members/:userId/roles/:roleId", Handler: s.RemoveGuildMemberRole, CSRF: true, Auth: true, Perm: permissions.PermManageRoles},
		{Method: "GET", Path: "/channels/:id/members", Handler: s.ListChannelMembersHandler, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/users/:id", Handler: s.GetProfile},
		{Method: "GET", Path: "/channels/:id/members", Handler: s.ListChannelMembersHandler},
		{Method: "PUT", Path: "/guilds/:guildId/members/:userId/roles/:roleId", Handler: s.AddGuildMemberRole, Perm: permissions.PermManageRoles},
		{Method: "DELETE", Path: "/guilds/:guildId/members/:userId/roles/:roleId", Handler: s.RemoveGuildMemberRole, Perm: permissions.PermManageRoles},
	}
}