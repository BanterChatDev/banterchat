package friends

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/friends", Handler: s.ListFriends, Auth: true},
		{Method: "POST", Path: "/friends", Handler: s.SendRequest, CSRF: true, Auth: true},
		{Method: "PUT", Path: "/friends/:id", Handler: s.AcceptRequest, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/friends/:id", Handler: s.DeclineOrRemove, CSRF: true, Auth: true},
		{Method: "GET", Path: "/blocks", Handler: s.ListBlocks, Auth: true},
		{Method: "GET", Path: "/blocked-by", Handler: s.ListBlockedBy, Auth: true},
		{Method: "POST", Path: "/blocks", Handler: s.BlockUser, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/blocks/:username", Handler: s.UnblockUser, CSRF: true, Auth: true},
	}
}