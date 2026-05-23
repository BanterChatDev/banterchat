package warnings

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/admin/users/:userId/warn", Handler: s.Issue, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/admin/users/:userId/warnings", Handler: s.ListForUser, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/admin/warnings/preset-reasons", Handler: s.PresetReasons, Auth: true, SiteAdmin: true},
		{Method: "DELETE", Path: "/admin/warnings/:id", Handler: s.Revoke, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/me/warnings", Handler: s.ListMine, Auth: true},
		{Method: "POST", Path: "/me/warnings/:id/acknowledge", Handler: s.Acknowledge, CSRF: true, Auth: true},
	}
}