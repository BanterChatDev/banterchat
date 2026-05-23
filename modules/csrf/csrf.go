package csrf

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"

	"github.com/labstack/echo/v4"
)

const (
	CookieName = "csrf_token"
	HeaderName = "X-CSRF-Token"
)

type Service struct {
	secure   bool
	sameSite http.SameSite
}

func NewService(secure bool) *Service {
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteStrictMode
	}
	return &Service{secure: secure, sameSite: sameSite}
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func (s *Service) EnsureToken(c echo.Context) string {
	cookie, err := c.Cookie(CookieName)
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}
	tok := generateToken()
	c.SetCookie(&http.Cookie{
		Name:     CookieName,
		Value:    tok,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: false,
		Secure:   s.secure,
		SameSite: s.sameSite,
	})
	return tok
}

func (s *Service) Validate(c echo.Context) bool {
	if isBot, _ := c.Get("isBot").(bool); isBot {
		return true
	}
	cookie, err := c.Cookie(CookieName)
	if err != nil || cookie.Value == "" {
		return false
	}
	header := c.Request().Header.Get(HeaderName)
	return header != "" && header == cookie.Value
}