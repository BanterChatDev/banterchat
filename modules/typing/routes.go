package typing

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/channels/:id/typing", Handler: s.GetTypers, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/channels/:id/typing", Handler: s.GetTypers},
	}
}