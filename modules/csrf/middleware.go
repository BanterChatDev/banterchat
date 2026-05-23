package csrf

import (
	"github.com/labstack/echo/v4"
)

func (s *Service) Middleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !s.Validate(c) {
			return c.JSON(403, echo.Map{"error": ErrInvalidToken.Error()})
		}
		return next(c)
	}
}