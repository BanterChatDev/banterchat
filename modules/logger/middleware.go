package logger

import (
	"time"

	"github.com/labstack/echo/v4"
)

func Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)
			req := c.Request()
			res := c.Response()
			if res.Committed && req.URL.Path == "/api/v1/ws" {
				return err
			}
			Info("request",
				"method", req.Method,
				"path", req.URL.Path,
				"status", res.Status,
				"dur", time.Since(start).String(),
				"ip", c.RealIP(),
			)
			return err
		}
	}
}