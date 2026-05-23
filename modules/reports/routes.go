package reports

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/reports", Handler: s.CreateReport, CSRF: true, Auth: true},
		{Method: "GET", Path: "/admin/reports", Handler: s.ListOpenReports, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/admin/reports/:id/resolve", Handler: s.Resolve, CSRF: true, Auth: true, SiteAdmin: true},
	}
}