package sitemoderation

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/users/:id/terminate", Handler: s.TerminateUser, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "DELETE", Path: "/users/:id/terminate", Handler: s.RestoreUser, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/terminations", Handler: s.ListTerminations, Auth: true, SiteAdmin: true},
	}
}