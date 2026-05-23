package proxy

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/proxy", Handler: s.Handle, Auth: true},
		{Method: "GET", Path: "/link-meta", Handler: s.FetchMeta, Auth: true},
		{Method: "GET", Path: "/oembed", Handler: s.FetchOEmbed, Auth: true},
	}
}