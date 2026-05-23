package discovery

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/db"
	"ror/modules/logger"
)

func (s *Service) HandleListingPage(c echo.Context) error {
	slug := strings.ToLower(strings.TrimSpace(c.Param("slug")))
	if s.tmpl == nil || s.tmpl.Listing == nil {
		return c.File("assets/public/index.html")
	}

	listing, err := s.getListingBySlug(slug)
	if err == ErrNotFound || err == sql.ErrNoRows || (listing != nil && !listing.Published) {
		return s.renderInvalidListing(c, slug)
	}
	if err != nil {
		logger.Error("listing lookup failed", "slug", slug, "error", err)
		return s.renderInvalidListing(c, slug)
	}

	guildRow, err := s.db.GetGuild(listing.GuildID)
	if err != nil || guildRow == nil {
		return s.renderInvalidListing(c, slug)
	}

	card := s.listingToCard(listing, guildRow)
	pl := s.cardToPublic(c, card)
	lv := &listingView{
		publicListing: pl,
		GuildID:       listing.GuildID,
		BumpedAt:      listing.BumpedAt,
		InviteURL:     s.mainAbsURL(c, "/invite/"+listing.InviteCode),
	}

	canonical := s.subdomainAbsURL(c, "/"+listing.Slug)
	metaDesc := strings.TrimSpace(listing.Bio)
	if metaDesc == "" {
		metaDesc = fmt.Sprintf("%s — a Banter community with %d members", card.GuildName, card.MemberCount)
	}
	if len(metaDesc) > 280 {
		metaDesc = metaDesc[:277] + "..."
	}

	userID := s.auth.SessionUserID(c)
	cooldownSec, err := s.userBumpCooldown(userID)
	if err != nil {
		logger.Error("page bump cooldown lookup failed", "user_id", userID, "error", err)
		cooldownSec = 0
	}

	data := pageData{
		Title:                  card.GuildName + " on Banter Guilds",
		Description:            metaDesc,
		CanonicalURL:           canonical,
		OGImage:                pl.BannerURL,
		MainHost:               s.MainHost(),
		JSONLD:                 buildListingJSONLD(pl, canonical),
		Listing:                lv,
		IsAuthenticated:        userID != "",
		InitialCooldownSeconds: cooldownSec,
		InitialUserStars:       s.userRatingStars(listing.GuildID, userID),
	}
	if data.OGImage == "" {
		data.OGImage = pl.IconURL
	}

	var buf bytes.Buffer
	if err := s.tmpl.Listing.Execute(&buf, data); err != nil {
		logger.Error("listing template execute failed", "slug", slug, "error", err)
		return c.File("assets/public/index.html")
	}
	return c.HTMLBlob(http.StatusOK, buf.Bytes())
}

func (s *Service) renderInvalidListing(c echo.Context, slug string) error {
	if s.tmpl == nil || s.tmpl.Listing == nil {
		return c.File("assets/public/index.html")
	}
	data := pageData{
		Title:        "Listing not found — Banter Guilds",
		Description:  "This server hasn't published a public listing.",
		CanonicalURL: s.subdomainAbsURL(c, "/"+slug),
		MainHost:     s.MainHost(),
		Invalid:      true,
	}
	var buf bytes.Buffer
	if err := s.tmpl.Listing.Execute(&buf, data); err != nil {
		return c.File("assets/public/index.html")
	}
	return c.HTMLBlob(http.StatusNotFound, buf.Bytes())
}

func (s *Service) HandleSPA(c echo.Context) error {
	return c.File("assets/public/discovery/app.html")
}

func (s *Service) HandleRobots(c echo.Context) error {
	body := "User-agent: *\nAllow: /\nSitemap: " + s.subdomainAbsURL(c, "/sitemap.xml") + "\n"
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.String(http.StatusOK, body)
}

type sitemapURL struct {
	XMLName xml.Name `xml:"url"`
	Loc     string   `xml:"loc"`
	LastMod string   `xml:"lastmod,omitempty"`
}

type sitemapSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

func (s *Service) HandleSitemap(c echo.Context) error {
	listings, err := s.listAllForSitemap()
	if err != nil {
		return c.String(http.StatusInternalServerError, "sitemap generation failed")
	}
	set := sitemapSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  make([]sitemapURL, 0, len(listings)+1),
	}
	set.URLs = append(set.URLs, sitemapURL{
		Loc:     s.subdomainAbsURL(c, "/"),
		LastMod: time.Now().UTC().Format("2006-01-02"),
	})
	for _, l := range listings {
		set.URLs = append(set.URLs, sitemapURL{
			Loc:     s.subdomainAbsURL(c, "/"+l.Slug),
			LastMod: l.BumpedAt.UTC().Format("2006-01-02"),
		})
	}
	buf := bytes.NewBufferString(xml.Header)
	enc := xml.NewEncoder(buf)
	enc.Indent("", "  ")
	if err := enc.Encode(set); err != nil {
		return c.String(http.StatusInternalServerError, "sitemap encoding failed")
	}
	c.Response().Header().Set("Content-Type", "application/xml; charset=utf-8")
	c.Response().Header().Set("Cache-Control", "public, max-age=3600")
	return c.Blob(http.StatusOK, "application/xml; charset=utf-8", buf.Bytes())
}

func (s *Service) listingToCard(l *Listing, g *db.GuildRow) ListingCard {
	return ListingCard{
		GuildID:     l.GuildID,
		Slug:        l.Slug,
		Bio:         l.Bio,
		Tags:        splitTags(l.Tags),
		Language:    l.Language,
		NSFW:        l.NSFW,
		InviteCode:  l.InviteCode,
		BumpedAt:    l.BumpedAt,
		BumpCount:   l.BumpCount,
		RatingAvg:   l.RatingAvg,
		RatingCount: l.RatingCount,
		GuildName:   s.decryptField(g.Name),
		Icon:        g.Icon,
		Banner:      g.Banner,
		MemberCount: s.db.CountGuildMembers(l.GuildID),
	}
}

func buildListingJSONLD(pl publicListing, pageURL string) template.JS {
	ld := map[string]interface{}{
		"@context":    "https://schema.org",
		"@type":       "Organization",
		"name":        pl.Name,
		"url":         pageURL,
		"description": pl.Bio,
	}
	if pl.IconURL != "" {
		ld["logo"] = pl.IconURL
	}
	if pl.BannerURL != "" {
		ld["image"] = pl.BannerURL
	}
	if pl.RatingCount > 0 {
		ld["aggregateRating"] = map[string]interface{}{
			"@type":       "AggregateRating",
			"ratingValue": fmt.Sprintf("%.1f", pl.RatingAvg),
			"reviewCount": fmt.Sprintf("%d", pl.RatingCount),
		}
	}
	b, err := json.Marshal(ld)
	if err != nil {
		return template.JS("{}")
	}
	return template.JS(b)
}