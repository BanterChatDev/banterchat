package emojis

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/emojis/default", Handler: s.ListDefaults, Auth: true},
		{Method: "GET", Path: "/emojis/category-icons", Handler: s.ListCategoryIcons, Auth: true},
		{Method: "GET", Path: "/emojis/frequent", Handler: s.ListFrequent, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId/emojis", Handler: s.List, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/emojis", Handler: s.Upload, CSRF: true, Auth: true},
		{Method: "PATCH", Path: "/guilds/:guildId/emojis/:emojiId", Handler: s.Rename, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/guilds/:guildId/emojis/:emojiId", Handler: s.Delete, CSRF: true, Auth: true},
		{Method: "GET", Path: "/emojis/:emojiId", Handler: s.Serve},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/emojis/default", Handler: s.ListDefaults},
	}
}