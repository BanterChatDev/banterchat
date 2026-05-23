package ratelimit

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

func (l *Limiter) Middleware() echo.MiddlewareFunc {
	skip := make(map[string]struct{}, len(l.config.SkipPaths))
	for _, p := range l.config.SkipPaths {
		skip[p] = struct{}{}
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			path := c.Request().URL.Path
			ip := c.RealIP()
			if !strings.HasPrefix(path, l.config.APIPrefix) {
				if l.config.GlobalRate > 0 && !l.AllowGlobal(ip) {
					return c.JSON(http.StatusTooManyRequests, echo.Map{
						"error": ErrRateLimitExceeded.Error(),
					})
				}
				return next(c)
			}
			if _, ok := skip[path]; ok {
				return next(c)
			}
			if !l.Allow(ip, c.Request().Method, path) {
				return c.JSON(http.StatusTooManyRequests, echo.Map{
					"error": ErrRateLimitExceeded.Error(),
				})
			}
			return next(c)
		}
	}
}