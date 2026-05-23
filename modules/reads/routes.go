package reads

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/reads", Handler: s.GetReads, Auth: true},
		{Method: "PUT", Path: "/reads/:id", Handler: s.MarkRead, CSRF: true, Auth: true},
	}
}