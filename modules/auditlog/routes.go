package auditlog

import (
	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/admin/audit-log", Handler: s.ListSite, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/admin/audit-log/export", Handler: s.ExportSite, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/guilds/:guildId/audit-log", Handler: s.ListGuild, Auth: true, Perm: permissions.PermViewAuditLog},
		{Method: "GET", Path: "/me/security-log", Handler: s.ListMine, Auth: true},
	}
}