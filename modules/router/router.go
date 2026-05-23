package router

import (
	"github.com/labstack/echo/v4"
)

// RouteConfig describes one HTTP route + its middleware stack. The
// Bot field selects which auth middleware runs: session (default) or
// bot token (Bot=true). There is intentionally no mixed mode — user
// routes live at /api/v1/* with session auth, bot routes at
// /api/v1/bot/* with bot-token auth, and nothing straddles both.
type RouteConfig struct {
	Method    string
	Path      string
	Handler   echo.HandlerFunc
	CSRF      bool
	Auth      bool
	Bot       bool // true = use bot-token auth; false = use session auth
	SiteAdmin bool
	Perm      int64
}

type PermMiddlewareFunc func(perm int64) echo.MiddlewareFunc

type Module interface {
	Prefix() string
	Routes() []RouteConfig
}

type BotModule interface {
	BotRoutes() []RouteConfig
}

type Router struct {
	echo        *echo.Echo
	apiPrefix   string
	csrfMw      echo.MiddlewareFunc
	authMw      echo.MiddlewareFunc
	botMw       echo.MiddlewareFunc
	siteAdminMw echo.MiddlewareFunc
	permMw      PermMiddlewareFunc
}

// New wires up the router with its middleware slots.
//
//   authMw: enforces session auth; rejects with 401 otherwise.
//   botMw:  enforces bot-token auth; rejects with 401 otherwise.
//
// The two are never composed — a RouteConfig picks one via .Bot.
func New(e *echo.Echo, apiPrefix string, csrfMw, authMw, botMw, siteAdminMw echo.MiddlewareFunc, permMw PermMiddlewareFunc) *Router {
	return &Router{echo: e, apiPrefix: apiPrefix, csrfMw: csrfMw, authMw: authMw, botMw: botMw, siteAdminMw: siteAdminMw, permMw: permMw}
}

func (r *Router) APIPrefix() string {
	return r.apiPrefix
}

func (r *Router) RegisterModule(m Module) {
	prefix := r.apiPrefix + m.Prefix()
	for _, rt := range m.Routes() {
		rt.Path = prefix + rt.Path
		r.Register(rt)
	}
}

func (r *Router) RegisterBotModule(m BotModule) {
	prefix := r.apiPrefix + "/bot"
	for _, rt := range m.BotRoutes() {
		rt.Path = prefix + rt.Path
		rt.Bot = true
		rt.Auth = true
		r.Register(rt)
	}
}

func (r *Router) Register(cfg RouteConfig) {
	var middlewares []echo.MiddlewareFunc
	if cfg.Auth {
		if cfg.Bot && r.botMw != nil {
			middlewares = append(middlewares, r.botMw)
		} else if r.authMw != nil {
			middlewares = append(middlewares, r.authMw)
		}
	}
	if cfg.SiteAdmin && r.siteAdminMw != nil {
		middlewares = append(middlewares, r.siteAdminMw)
	}
	if cfg.Perm != 0 && r.permMw != nil {
		middlewares = append(middlewares, r.permMw(cfg.Perm))
	}
	if cfg.CSRF && r.csrfMw != nil {
		middlewares = append(middlewares, r.csrfMw)
	}
	switch cfg.Method {
	case "GET":
		r.echo.GET(cfg.Path, cfg.Handler, middlewares...)
	case "POST":
		r.echo.POST(cfg.Path, cfg.Handler, middlewares...)
	case "PUT":
		r.echo.PUT(cfg.Path, cfg.Handler, middlewares...)
	case "PATCH":
		r.echo.PATCH(cfg.Path, cfg.Handler, middlewares...)
	case "DELETE":
		r.echo.DELETE(cfg.Path, cfg.Handler, middlewares...)
	}
}

func (r *Router) RegisterGroup(prefix string, csrf, auth bool, routes []RouteConfig) {
	for _, route := range routes {
		route.Path = prefix + route.Path
		if !route.CSRF {
			route.CSRF = csrf
		}
		if !route.Auth {
			route.Auth = auth
		}
		r.Register(route)
	}
}

func (r *Router) Static(path, dir string) {
	r.echo.Static(path, dir)
}