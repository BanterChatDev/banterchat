package admin

import "ror/modules/router"

func (s *Service) Prefix() string {
	return "/admin"
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/stats", Handler: s.Stats, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/users", Handler: s.ListUsers, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/guilds", Handler: s.ListGuilds, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/guilds/:guildId", Handler: s.GuildDetail, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/bots", Handler: s.ListBots, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/bots/:appId", Handler: s.BotDetail, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/guilds/:guildId/terminate", Handler: s.TerminateGuild, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/users/:userId/suspend", Handler: s.SuspendUser, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/users/:userId/unsuspend", Handler: s.UnsuspendUser, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "DELETE", Path: "/users/:userId", Handler: s.DeleteUser, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/users/:userId/force-logout", Handler: s.ForceLogoutUser, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/guilds/:guildId/suspend", Handler: s.SuspendGuild, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/guilds/:guildId/unsuspend", Handler: s.UnsuspendGuild, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/users/:userId/promote", Handler: s.PromoteToSiteAdmin, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/users/:userId/demote", Handler: s.DemoteFromSiteAdmin, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/site-admins", Handler: s.ListSiteAdmins, Auth: true, SiteAdmin: true},
	}
}