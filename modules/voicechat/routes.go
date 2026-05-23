package voicechat

import "ror/modules/router"

func (s *Service) Prefix() string {
	return "/voice"
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/token", Handler: s.HandleToken, Auth: true, CSRF: true},
		{Method: "GET", Path: "/states", Handler: s.HandleGetStates, Auth: true},
		{Method: "POST", Path: "/webhook", Handler: s.HandleWebhook},
	}
}