package interactions

import "ror/modules/router"

func (a *API) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/interactions/:id/respond", Handler: a.Respond},
	}
}