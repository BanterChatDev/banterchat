package guilds

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds", Handler: s.List, Auth: true},
		{Method: "POST", Path: "/guilds", Handler: s.Create, CSRF: true, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId", Handler: s.Get, Auth: true},
		{Method: "PUT", Path: "/guilds/:guildId", Handler: s.Update, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/guilds/:guildId", Handler: s.Delete, CSRF: true, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId/me", Handler: s.Me, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId/me/profile", Handler: s.GetMyProfile, Auth: true},
		{Method: "PUT", Path: "/guilds/:guildId/me/profile", Handler: s.UpdateMyProfile, CSRF: true, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/leave", Handler: s.Leave, CSRF: true, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/transfer-ownership", Handler: s.TransferOwnership, CSRF: true, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId/members/:userId", Handler: s.GetMember, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/members/:userId/kick", Handler: s.KickMember, CSRF: true, Auth: true, Perm: permissions.PermKickMembers},
		{Method: "POST", Path: "/guilds/:guildId/members/:userId/ban", Handler: s.BanMember, CSRF: true, Auth: true, Perm: permissions.PermBanMembers},
		{Method: "DELETE", Path: "/guilds/:guildId/members/:userId/ban", Handler: s.UnbanMember, CSRF: true, Auth: true, Perm: permissions.PermBanMembers},
		{Method: "GET", Path: "/guilds/:guildId/bans", Handler: s.ListBans, Auth: true, Perm: permissions.PermBanMembers},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId", Handler: s.Get},
		{Method: "PATCH", Path: "/guilds/:guildId", Handler: s.Update, Perm: permissions.PermManageGuild},
		{Method: "GET", Path: "/guilds/:guildId/members/:userId", Handler: s.GetMember},
		{Method: "POST", Path: "/guilds/:guildId/members/:userId/kick", Handler: s.KickMember, Perm: permissions.PermKickMembers},
		{Method: "POST", Path: "/guilds/:guildId/members/:userId/ban", Handler: s.BanMember, Perm: permissions.PermBanMembers},
		{Method: "DELETE", Path: "/guilds/:guildId/members/:userId/ban", Handler: s.UnbanMember, Perm: permissions.PermBanMembers},
		{Method: "GET", Path: "/guilds/:guildId/bans", Handler: s.ListBans, Perm: permissions.PermBanMembers},
	}
}