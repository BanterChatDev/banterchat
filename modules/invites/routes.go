package invites

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/guilds/:guildId/invites", Handler: s.ListInvites, Auth: true},
		{Method: "POST", Path: "/guilds/:guildId/invites", Handler: s.CreateInvite, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/guilds/:guildId/invites/:code", Handler: s.DeleteInvite, CSRF: true, Auth: true},
		{Method: "GET", Path: "/invites/:code", Handler: s.GetInvitePreview, Auth: true},
		{Method: "POST", Path: "/invites/:code/join", Handler: s.JoinByInvite, CSRF: true, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId/vanity", Handler: s.GetVanity, Auth: true},
		{Method: "PUT", Path: "/guilds/:guildId/vanity", Handler: s.SetVanity, CSRF: true, Auth: true, Perm: permissions.PermManageVanity},
		{Method: "DELETE", Path: "/guilds/:guildId/vanity", Handler: s.RemoveVanity, CSRF: true, Auth: true, Perm: permissions.PermManageVanity},
		{Method: "DELETE", Path: "/admin/guilds/:guildId/vanity", Handler: s.AdminForceClearVanity, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "POST", Path: "/admin/vanity/reserve", Handler: s.AdminReserveVanity, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/admin/vanity/reserved", Handler: s.AdminListReservedVanity, Auth: true, SiteAdmin: true},
	}
}