package oauth2

import "ror/modules/router"

func (s *Service) Prefix() string {
	return "/oauth2"
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/app_info", Handler: s.GetAppInfo, Auth: true},
		{Method: "GET", Path: "/manageable_guilds", Handler: s.ListManageableGuilds, Auth: true},
		{Method: "POST", Path: "/authorize", Handler: s.Authorize, Auth: true, CSRF: true},
	}
}