package apperr

import (
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
)

var notFoundHTML []byte

func init() {
	if b, err := os.ReadFile("assets/public/404.html"); err == nil {
		notFoundHTML = b
	}
}

func NotFound(c echo.Context) error {
	accept := c.Request().Header.Get("Accept")
	if strings.Contains(accept, "text/html") {
		if notFoundHTML != nil {
			return c.HTMLBlob(http.StatusNotFound, notFoundHTML)
		}
		return c.HTML(http.StatusNotFound, "<!doctype html><title>404</title><h1>404 Not Found</h1>")
	}
	return c.JSON(http.StatusNotFound, echo.Map{"error": ErrNotFound.Error()})
}