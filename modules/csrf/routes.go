package csrf

import (
	"github.com/labstack/echo/v4"
	"ror/modules/router"
)

func (s *Service) Prefix() string {
	return ""
}

func (s *Service) Routes() []router.RouteConfig {
	return []router.RouteConfig{
		{Method: "GET", Path: "/csrf", Handler: func(c echo.Context) error {
			return c.JSON(200, echo.Map{"csrf_token": s.EnsureToken(c)})
		}},
	}
}