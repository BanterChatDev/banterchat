package invites

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/httputil"
)

type invitePageData struct {
	Title            string
	Description      string
	PageURL          string
	LoginURL         string
	RegisterURL      string
	GuildChannelURL  string
	ImageURL         string
	BannerURL        string
	IconURL          string
	Code             string
	GuildID          string
	GuildName        string
	GuildDescription string
	MemberCount      int
	Initials         string
	IsAuthenticated  bool
	AlreadyMember    bool
	Invalid          bool
}

// InvitePage renders the public HTML unfurl page for a guild invite
// code. Mirrors the architecture the bot-invite page uses (which was
// in fact modeled after this one): per-guild OG meta tags in <head>
// so link previews show the guild's name/icon; full HTML UI in <body>
// with inline vanilla JS handling the accept-invite POST.
//
// If the template isn't wired up (edge case — main.go forgot to call
// SetInvitePageTemplate) we fall back to serving the SPA index.html
// so the route at least responds. If the code is invalid/expired/
// exhausted we render the same template's "invalid" branch with 404.
func (s *Service) InvitePage(c echo.Context) error {
	code := c.Param("code")
	if s.invitePageTemplate == nil {
		return c.File("assets/public/index.html")
	}
	prev, err := s.resolveInvitePreview(code)
	if err != nil {
		var buf bytes.Buffer
		if terr := s.invitePageTemplate.Execute(&buf, invitePageData{
			Title:       "Invite invalid",
			Description: "This invite is invalid or has expired.",
			PageURL:     httputil.AbsURL(c, "/invite/"+code),
			Invalid:     true,
		}); terr != nil {
			return c.File("assets/public/index.html")
		}
		return c.HTMLBlob(404, buf.Bytes())
	}
	g := prev.Guild

	userID := ""
	if s.auth != nil {
		userID = s.auth.SessionUserID(c)
	}
	urlCode := code
	if prev.VanitySlug != "" {
		urlCode = prev.VanitySlug
	}
	continuePath := "/invite/" + urlCode
	metaDesc := strings.TrimSpace(g.Description)
	if metaDesc == "" {
		metaDesc = fmt.Sprintf("You've been invited to join %s — %d members", g.Name, g.MemberCount)
	}
	data := invitePageData{
		Title:            "Join " + g.Name + " on Banter",
		Description:      metaDesc,
		PageURL:          httputil.AbsURL(c, continuePath),
		LoginURL:         "/login?continue=" + continuePath,
		RegisterURL:      "/register?continue=" + continuePath,
		GuildChannelURL:  "/channels/" + g.ID,
		Code:             code,
		GuildID:          g.ID,
		GuildName:        g.Name,
		GuildDescription: g.Description,
		MemberCount:      g.MemberCount,
		Initials:         httputil.InitialsOf(g.Name),
		IsAuthenticated:  userID != "",
	}
	if userID != "" && s.db.IsGuildMember(g.ID, userID) {
		data.AlreadyMember = true
	}
	if g.Icon != "" {
		data.IconURL = httputil.AbsURL(c, "/api/v1/guild-avatars/"+g.Icon)
		data.ImageURL = data.IconURL
	}
	if g.Banner != "" {
		data.BannerURL = httputil.AbsURL(c, "/api/v1/guild-banners/"+g.Banner)
		if data.ImageURL == "" {
			data.ImageURL = data.BannerURL
		}
	}

	var buf bytes.Buffer
	if err := s.invitePageTemplate.Execute(&buf, data); err != nil {
		return c.File("assets/public/index.html")
	}
	return c.HTMLBlob(200, buf.Bytes())
}