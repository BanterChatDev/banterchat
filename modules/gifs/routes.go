package gifs

import "ror/modules/router"

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/gifs/search", Handler: s.Search, Auth: true},
		{Method: "GET", Path: "/gifs/trending", Handler: s.Trending, Auth: true},
		{Method: "GET", Path: "/me/gif-tabs", Handler: s.ListTabs, Auth: true},
		{Method: "POST", Path: "/me/gif-tabs", Handler: s.CreateTab, CSRF: true, Auth: true},
		{Method: "PATCH", Path: "/me/gif-tabs/:tabId", Handler: s.RenameTab, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/me/gif-tabs/:tabId", Handler: s.DeleteTab, CSRF: true, Auth: true},
		{Method: "GET", Path: "/me/gif-favorites", Handler: s.ListFavorites, Auth: true},
		{Method: "POST", Path: "/me/gif-favorites", Handler: s.AddFavorite, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/me/gif-favorites/:favId", Handler: s.DeleteFavorite, CSRF: true, Auth: true},
		{Method: "PATCH", Path: "/me/gif-favorites/:favId", Handler: s.MoveFavorite, CSRF: true, Auth: true},
	}
}

func (s *Service) BotRoutes() []router.RouteConfig {
	return nil
}