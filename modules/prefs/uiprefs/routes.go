package uiprefs

import (
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/me/prefs", Handler: s.GetPrefs, Auth: true},
		{Method: "PUT", Path: "/me/prefs", Handler: s.UpdatePrefs, CSRF: true, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return nil
}