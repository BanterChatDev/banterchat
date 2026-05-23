package presence

import "ror/modules/router"

func (s *Service) Prefix() string {
	return "/me/status"
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "", Handler: s.GetMyStatusHandler, Auth: true},
		{Method: "PUT", Path: "", Handler: s.SetStatusHandler, CSRF: true, Auth: true},
	}
}