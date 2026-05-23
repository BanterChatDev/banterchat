package bots

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (a *API) Prefix() string {
	return ""
}

func (a *API) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/applications", Handler: a.CreateApp, Auth: true, CSRF: true},
		{Method: "GET", Path: "/applications", Handler: a.ListApps, Auth: true},
		{Method: "GET", Path: "/applications/:id", Handler: a.GetApp, Auth: true},
		{Method: "PATCH", Path: "/applications/:id", Handler: a.UpdateApp, Auth: true, CSRF: true},
		{Method: "DELETE", Path: "/applications/:id", Handler: a.DeleteApp, Auth: true, CSRF: true},
		{Method: "POST", Path: "/applications/:id/token", Handler: a.RotateToken, Auth: true, CSRF: true},
		{Method: "PUT", Path: "/applications/:id/avatar", Handler: a.UpdateBotAvatar, Auth: true, CSRF: true},
		{Method: "DELETE", Path: "/applications/:id/avatar", Handler: a.DeleteBotAvatar, Auth: true, CSRF: true},
		{Method: "PUT", Path: "/applications/:id/banner", Handler: a.UpdateBotBanner, Auth: true, CSRF: true},
		{Method: "DELETE", Path: "/applications/:id/banner", Handler: a.DeleteBotBanner, Auth: true, CSRF: true},
		{Method: "PUT", Path: "/applications/:id/commands", Handler: a.svc.DedupCommandsMiddleware()(a.RegisterCommands), Auth: true, CSRF: true},
		{Method: "GET", Path: "/applications/:id/commands", Handler: a.ListCommands, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId/commands", Handler: a.ListGuildCommands, Auth: true, Perm: permissions.PermViewChannels},
	}
}

func (a *API) BotRoutes() []router.RouteConfig {
	dedup := a.svc.DedupCommandsMiddleware()
	return []router.RouteConfig{
		{Method: "GET", Path: "/users/@me", Handler: a.Me},
		{Method: "POST", Path: "/channels/:id/messages", Handler: a.SendMessage},
		{Method: "PATCH", Path: "/messages/:id", Handler: a.EditMessage},
		{Method: "DELETE", Path: "/messages/:id", Handler: a.DeleteMessage},
		{Method: "POST", Path: "/channels/:id/typing", Handler: a.Typing},
		{Method: "PUT", Path: "/channels/:chid/messages/:mid/reactions/:emoji/@me", Handler: a.AddReaction},
		{Method: "DELETE", Path: "/channels/:chid/messages/:mid/reactions/:emoji/@me", Handler: a.RemoveReaction},
		{Method: "PUT", Path: "/applications/@me/commands", Handler: dedup(a.RegisterCommandsSelf)},
		{Method: "GET", Path: "/applications/@me/commands", Handler: a.ListCommandsSelf},
		{Method: "GET", Path: "/channels/:channelId/webhooks", Handler: a.webhooks.ListInChannel},
		{Method: "POST", Path: "/channels/:channelId/webhooks", Handler: a.webhooks.Create},
		{Method: "POST", Path: "/webhooks/:id/:token", Handler: a.webhooks.Execute},
	}
}