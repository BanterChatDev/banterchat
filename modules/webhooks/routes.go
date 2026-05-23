package webhooks

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "POST", Path: "/channels/:channelId/webhooks", Handler: s.Create, CSRF: true, Auth: true, Perm: permissions.PermManageWebhooks},
		{Method: "GET", Path: "/channels/:channelId/webhooks", Handler: s.ListInChannel, Auth: true, Perm: permissions.PermManageWebhooks},
		{Method: "GET", Path: "/guilds/:guildId/webhooks", Handler: s.ListInGuild, Auth: true, Perm: permissions.PermManageWebhooks},
		{Method: "PATCH", Path: "/webhooks/:id", Handler: s.Update, CSRF: true, Auth: true, Perm: permissions.PermManageWebhooks},
		{Method: "DELETE", Path: "/webhooks/:id", Handler: s.Delete, CSRF: true, Auth: true, Perm: permissions.PermManageWebhooks},
		{Method: "POST", Path: "/webhooks/:id/regenerate-token", Handler: s.RegenerateToken, CSRF: true, Auth: true, Perm: permissions.PermManageWebhooks},
	}
}

func (s *AvatarService) Prefix() string {
	return ""
}

func (s *AvatarService) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "PUT", Path: "/webhooks/:id/avatar", Handler: s.Upload, CSRF: true, Auth: true, Perm: permissions.PermManageWebhooks},
		{Method: "DELETE", Path: "/webhooks/:id/avatar", Handler: s.Delete, CSRF: true, Auth: true, Perm: permissions.PermManageWebhooks},
		{Method: "GET", Path: "/webhook-avatars/:id", Handler: s.Serve, Auth: true},
	}
}