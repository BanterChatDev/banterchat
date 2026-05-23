package websocket

import "ror/modules/router"

func (h *Hub) Prefix() string {
	return ""
}

func (h *Hub) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/ws", Handler: h.HandleConnect, Auth: true},
	}
}

func (h *Hub) BotRoutes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/gateway", Handler: h.HandleBotConnect},
	}
}