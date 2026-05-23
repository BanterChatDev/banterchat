package notifprefs

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/me/notification-prefs", Handler: s.ListMine, Auth: true},
		{Method: "GET", Path: "/me/notification-prefs/global", Handler: s.GetGlobal, Auth: true},
		{Method: "PUT", Path: "/me/notification-prefs/global", Handler: s.PutGlobal, CSRF: true, Auth: true},
		{Method: "GET", Path: "/me/notification-prefs/guilds/:guildId", Handler: s.GetGuild, Auth: true},
		{Method: "PUT", Path: "/me/notification-prefs/guilds/:guildId", Handler: s.PutGuild, CSRF: true, Auth: true},
		{Method: "GET", Path: "/me/notification-prefs/channels/:channelId", Handler: s.GetChannel, Auth: true},
		{Method: "PUT", Path: "/me/notification-prefs/channels/:channelId", Handler: s.PutChannel, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/me/notification-prefs/:scopeType/:scopeId", Handler: s.Reset, CSRF: true, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return nil
}