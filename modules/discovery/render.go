package discovery

import (
	"html/template"
	"ror/modules/conf"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/encryption"
	"ror/modules/httputil"
)

type pageData struct {
	Title                  string
	Description            string
	Keywords               string
	CanonicalURL           string
	OGImage                string
	MainHost               string
	LoginURL               string
	JSONLD                 template.JS
	Listing                *listingView
	Invalid                bool
	IsAuthenticated        bool
	InitialCooldownSeconds int
	InitialUserStars       int
}

type listingView struct {
	publicListing
	InviteURL string
	GuildID   string
	BumpedAt  time.Time
}

func (s *Service) decryptField(ciphertext string) string {
	return encryption.DecryptField(ciphertext, conf.MasterKey)
}

func (s *Service) subdomainAbsURL(c echo.Context, path string) string {
	return httputil.AbsURLOnHost(c, s.SubdomainHost(), path)
}

func (s *Service) mainAbsURL(c echo.Context, path string) string {
	return httputil.AbsURLOnHost(c, s.MainHost(), path)
}

func nsfwOptedIn(c echo.Context) bool {
	cookie, err := c.Cookie("nsfw_opt_in")
	if err != nil {
		return false
	}
	return cookie.Value == "1"
}