package avatar

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "PUT", Path: "/me/avatar", Handler: s.Upload, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/me/avatar", Handler: s.Delete, CSRF: true, Auth: true},
		{Method: "GET", Path: "/avatars/:id", Handler: s.Serve, Auth: true},
		{Method: "PUT", Path: "/guilds/:guildId/icon", Handler: s.UploadGuild, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/guilds/:guildId/icon", Handler: s.DeleteGuild, CSRF: true, Auth: true},
		{Method: "GET", Path: "/guild-avatars/:id", Handler: s.ServeGuild},
	}
}