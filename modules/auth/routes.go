package auth

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	kfH := s.KeyfileHandlers()
	return []router.RouteConfig{
		{Method: "POST", Path: "/register", Handler: s.Register, CSRF: true},
		{Method: "POST", Path: "/login", Handler: s.Login, CSRF: true},
		{Method: "POST", Path: "/logout", Handler: s.Logout, CSRF: true, Auth: true},
		{Method: "POST", Path: "/auth/forgot", Handler: kfH.ForgotPassword, CSRF: true},
		{Method: "POST", Path: "/auth/verify-keyfile", Handler: kfH.VerifyNewDevice, CSRF: true},
		{Method: "PUT", Path: "/me/password", Handler: s.ChangePassword, CSRF: true, Auth: true},
		{Method: "POST", Path: "/me/keyfile", Handler: kfH.Generate, CSRF: true, Auth: true},
		{Method: "PUT", Path: "/me/keyfile", Handler: kfH.Rotate, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/me/keyfile", Handler: kfH.Remove, CSRF: true, Auth: true},
		{Method: "GET", Path: "/sessions", Handler: s.ListSessions, Auth: true},
		{Method: "DELETE", Path: "/sessions/:id", Handler: s.RevokeSession, CSRF: true, Auth: true},
	}
}