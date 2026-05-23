package httputil

import (
	"fmt"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

func resolveScheme(c echo.Context) string {
	if proto := c.Request().Header.Get("X-Forwarded-Proto"); proto != "" {
		return proto
	}
	if c.Request().TLS != nil {
		return "https"
	}
	return c.Scheme()
}

func AbsURL(c echo.Context, path string) string {
	return fmt.Sprintf("%s://%s%s", resolveScheme(c), c.Request().Host, path)
}

func AbsURLOnHost(c echo.Context, host, path string) string {
	if host == "" {
		host = c.Request().Host
	}
	return fmt.Sprintf("%s://%s%s", resolveScheme(c), host, path)
}

func InitialsOf(name string) string {
	out := ""
	for _, w := range strings.Fields(name) {
		if len(out) >= 2 {
			break
		}
		if len(w) > 0 {
			out += strings.ToUpper(string([]rune(w)[0]))
		}
	}
	if out == "" {
		return "?"
	}
	return out
}

func HumanAgo(t time.Time) string {
	d := time.Since(t)
	if d < time.Minute {
		return "just now"
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm ago", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh ago", int(d.Hours()))
	}
	days := int(d.Hours() / 24)
	if days < 30 {
		return fmt.Sprintf("%dd ago", days)
	}
	if days < 365 {
		return fmt.Sprintf("%dmo ago", days/30)
	}
	return fmt.Sprintf("%dy ago", days/365)
}