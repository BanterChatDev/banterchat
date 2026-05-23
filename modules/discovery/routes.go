package discovery

import (
	"github.com/labstack/echo/v4"

	"ror/modules/permissions"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/admin/listings", Handler: s.AdminListListings, Auth: true, SiteAdmin: true},
		{Method: "DELETE", Path: "/admin/listings/:guildId", Handler: s.AdminUnlistListing, CSRF: true, Auth: true, SiteAdmin: true},
		{Method: "GET", Path: "/guilds/:guildId/listing", Handler: s.GetListingForGuild, Auth: true},
		{Method: "GET", Path: "/guilds/:guildId/listing/slug-check", Handler: s.CheckSlugAvailable, Auth: true, Perm: permissions.PermManageGuild},
		{Method: "PUT", Path: "/guilds/:guildId/listing", Handler: s.PutListing, CSRF: true, Auth: true, Perm: permissions.PermManageGuild},
		{Method: "DELETE", Path: "/guilds/:guildId/listing", Handler: s.DeleteListing, CSRF: true, Auth: true, Perm: permissions.PermManageGuild},
	}
}

func (s *Service) RegisterPublic(e *echo.Echo) {
	e.GET("/api/public/listings/recent", s.PublicListRecent)
	e.GET("/api/public/listings/search", s.PublicSearch)
	e.GET("/api/public/listings/tag/:tag", s.PublicByTag)
	e.POST("/api/public/listings/:slug/bump", s.PublicBump)
	e.POST("/api/public/listings/:slug/rate", s.PublicRate)

	sub := s.SubdomainHost()
	if sub == "" {
		return
	}
	host := e.Host(sub)
	host.GET("/", s.HandleSPA)
	host.GET("/search", s.HandleSPA)
	host.GET("/tag/:tag", s.HandleSPA)
	host.GET("/robots.txt", s.HandleRobots)
	host.GET("/sitemap.xml", s.HandleSitemap)
	host.GET("/api/public/listings/recent", s.PublicListRecent)
	host.GET("/api/public/listings/search", s.PublicSearch)
	host.GET("/api/public/listings/tag/:tag", s.PublicByTag)
	host.POST("/api/public/listings/:slug/bump", s.PublicBump)
	host.POST("/api/public/listings/:slug/rate", s.PublicRate)
	host.GET("/js/*", func(c echo.Context) error { return c.File("assets/public" + c.Request().URL.Path) })
	host.GET("/css/*", func(c echo.Context) error { return c.File("assets/public" + c.Request().URL.Path) })
	host.GET("/:slug", s.HandleListingPage)
}