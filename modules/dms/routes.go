package dms

import "ror/modules/router"

func (s *Service) Prefix() string {
	return "/dms"
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "", Handler: s.List, Auth: true},
		{Method: "POST", Path: "/:peerId", Handler: s.GetOrCreate, CSRF: true, Auth: true},
		{Method: "GET", Path: "/:peerId/messages", Handler: s.ListMessages, Auth: true},
		{Method: "GET", Path: "/:peerId/members", Handler: s.GetMembers, Auth: true},
		{Method: "DELETE", Path: "/:peerId", Handler: s.Close, CSRF: true, Auth: true},
	}
}