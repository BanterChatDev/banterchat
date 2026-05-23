package banner

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "PUT", Path: "/me/banner", Handler: s.Upload, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/me/banner", Handler: s.Delete, CSRF: true, Auth: true},
		{Method: "GET", Path: "/banners/:id", Handler: s.Serve, Auth: true},
		{Method: "PUT", Path: "/guilds/:guildId/banner", Handler: s.UploadGuild, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/guilds/:guildId/banner", Handler: s.DeleteGuild, CSRF: true, Auth: true},
		{Method: "GET", Path: "/guild-banners/:id", Handler: s.ServeGuild},
	}
}