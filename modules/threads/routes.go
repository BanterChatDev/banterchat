package threads

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/channels/:channelId/threads", Handler: s.List, Auth: true},
		{Method: "POST", Path: "/channels/:channelId/threads", Handler: s.Create, CSRF: true, Auth: true},
		{Method: "GET", Path: "/threads/:threadId", Handler: s.Get, Auth: true},
		{Method: "PUT", Path: "/threads/:threadId/archive", Handler: s.Archive, CSRF: true, Auth: true},
		{Method: "PUT", Path: "/threads/:threadId/unarchive", Handler: s.Unarchive, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/threads/:threadId", Handler: s.Delete, CSRF: true, Auth: true},
	}
}