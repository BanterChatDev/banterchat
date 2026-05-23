package attachments

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/attachments", Handler: s.Upload, CSRF: true, Auth: true},
		{Method: "POST", Path: "/attachments/probe", Handler: s.Probe, CSRF: true, Auth: true},
		{Method: "GET", Path: "/attachments/:id", Handler: s.Download},
		{Method: "GET", Path: "/attachments/:id/view", Handler: s.View},
		{Method: "PUT", Path: "/me/sounds/notification", Handler: s.UploadUserFile, CSRF: true, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/attachments", Handler: s.Upload},
		{Method: "GET", Path: "/attachments/:id", Handler: s.Download},
	}
}