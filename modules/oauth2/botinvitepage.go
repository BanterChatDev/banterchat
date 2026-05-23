package oauth2

import (
	"bytes"
	"fmt"
	"html/template"
	"strings"

	"github.com/labstack/echo/v4"

	"ror/modules/httputil"
	"ror/modules/permissions"
)

type botInvitePageData struct {
	Title           string
	Description     string
	PageURL         string
	ImageURL        string
	IconURL         string
	Initial         string
	BotName         string
	BotDisplay      string
	Discriminator   string
	BotDescription  string
	ClientID        string
	Permissions     []string
	PermissionsRaw  int64
	LoginURL        string
	RegisterURL     string
	IsAuthenticated bool
	Invalid         bool
}

// BotInvitePage serves /oauth2/authorize as a fully server-rendered
// page. No React. Mirrors the architecture of invite.html (guild
// invites) — template renders the UI with per-bot data, vanilla JS
// handles the authorize API call.
//
// The <head> carries bot-specific OG/Twitter meta so link previews on
// Discord/Slack/Twitter show the bot's avatar and name. The <body>
// renders the same UI a crawler could read.
//
// On invalid client_id: renders the "invite invalid" branch with 404.
// On missing template (shouldn't happen if main wired it up): falls
// back to SPA index.html so the route at least returns something.
func (s *Service) BotInvitePage(c echo.Context) error {
	if s.botInviteTemplate == nil {
		return c.File("assets/public/index.html")
	}
	pageURL := httputil.AbsURL(c, c.Request().URL.RequestURI())
	clientID := c.QueryParam("client_id")

	if clientID == "" || s.LookupAppPublic == nil {
		return s.renderBotInviteInvalid(c, pageURL)
	}
	app, err := s.LookupAppPublic(clientID)
	if err != nil || app == nil {
		return s.renderBotInviteInvalid(c, pageURL)
	}

	displayName := app.DisplayTag
	if displayName == "" {
		displayName = app.Name
	}
	title := fmt.Sprintf("Add %s to a Server on Banter", displayName)
	desc := app.Description
	if desc == "" {
		desc = fmt.Sprintf("%s is a bot on Banter. Click to add it to a server you manage.", displayName)
	}

	// Permission bits from the query string. The consent flow passes
	// a bitmask the bot's creator wants the bot to have; we show the
	// human-readable names here and forward the raw bits to JS.
	var permBits int64
	if v := c.QueryParam("permissions"); v != "" {
		_, err := fmt.Sscanf(v, "%d", &permBits)
		if err != nil {
			permBits = 0
		}
	}

	continuePath := c.Request().URL.RequestURI()
	userID := ""
	if s.SessionUserID != nil {
		userID = s.SessionUserID(c)
	}

	data := botInvitePageData{
		Title:           title,
		Description:     desc,
		PageURL:         pageURL,
		BotName:         app.Name,
		BotDisplay:      displayName,
		Discriminator:   app.Discriminator,
		BotDescription:  app.Description,
		ClientID:        app.ID,
		Permissions:     permissionNames(permBits),
		PermissionsRaw:  permBits,
		LoginURL:        "/login?continue=" + continuePath,
		RegisterURL:     "/register?continue=" + continuePath,
		IsAuthenticated: userID != "",
		Initial:         initialOf(app.Name),
	}
	if app.AvatarID != "" {
		avatarAbs := httputil.AbsURL(c, "/api/v1/avatars/"+app.AvatarID)
		data.ImageURL = avatarAbs
		data.IconURL = avatarAbs
	}
	return s.executeBotInviteTemplate(c, data, 200)
}

func (s *Service) renderBotInviteInvalid(c echo.Context, pageURL string) error {
	data := botInvitePageData{
		Title:       "Bot invite invalid",
		Description: "This bot invite link is invalid or the bot has been deleted.",
		PageURL:     pageURL,
		Invalid:     true,
	}
	return s.executeBotInviteTemplate(c, data, 404)
}

func (s *Service) executeBotInviteTemplate(c echo.Context, data botInvitePageData, status int) error {
	var buf bytes.Buffer
	if err := s.botInviteTemplate.Execute(&buf, data); err != nil {
		return c.File("assets/public/index.html")
	}
	return c.HTMLBlob(status, buf.Bytes())
}

// SetBotInvitePageTemplate wires a pre-parsed template into the
// service. Called from main.go after ParseFiles.
func (s *Service) SetBotInvitePageTemplate(t *template.Template) {
	s.botInviteTemplate = t
}

// permissionNames maps a bitmask to the human-readable labels of each
// set permission. Uses the same registry the rest of the app uses so
// the rendered list stays consistent with the backend's perm model.
func permissionNames(bits int64) []string {
	if bits == 0 {
		return nil
	}
	out := []string{}
	for _, p := range permissions.GetAll() {
		if bits&p.Bit != 0 {
			out = append(out, p.Label)
		}
	}
	return out
}

func initialOf(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "?"
	}
	return strings.ToUpper(string([]rune(s)[0]))
}