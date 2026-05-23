package invites

import (
	"regexp"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/httputil"
)

var slugRe = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$`)

func normalizeSlug(in string) string {
	return strings.ToLower(strings.TrimSpace(in))
}

func vanityURL(c echo.Context, slug string) string {
	return httputil.AbsURL(c, "/invite/"+slug)
}

func (s *Service) Bootstrap() {
	for _, slug := range s.cfg.ReservedSlugs {
		s.db.Exec(`INSERT INTO reserved_vanities (slug, reason) VALUES ($1, 'system reserved') ON CONFLICT DO NOTHING`, slug)
	}
}

func (s *Service) getGuildBySlug(slug string) (string, bool) {
	slug = normalizeSlug(slug)
	var guildID string
	err := s.db.QueryRow(`SELECT guild_id FROM vanity_urls WHERE slug = $1`, slug).Scan(&guildID)
	if err != nil {
		return "", false
	}
	return guildID, true
}

func (s *Service) GetVanity(c echo.Context) error {
	guildID := c.Param("guildId")
	var slug string
	var useCount int64
	var locked bool
	err := s.db.QueryRow(`SELECT slug, use_count, locked FROM vanity_urls WHERE guild_id = $1`, guildID).
		Scan(&slug, &useCount, &locked)
	if err != nil {
		return c.JSON(200, echo.Map{"slug": "", "url": ""})
	}
	return c.JSON(200, echo.Map{
		"slug":      slug,
		"guild_id":  guildID,
		"use_count": useCount,
		"locked":    locked,
		"url":       vanityURL(c, slug),
	})
}

func (s *Service) SetVanity(c echo.Context) error {
	actorID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	var body struct {
		Slug string `json:"slug"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid body"})
	}
	slug := normalizeSlug(body.Slug)
	if !slugRe.MatchString(slug) {
		return c.JSON(400, echo.Map{"error": "slug must be 2-32 chars, a-z 0-9 hyphen, no leading/trailing hyphen"})
	}

	var reservedReason string
	if err := s.db.QueryRow(`SELECT reason FROM reserved_vanities WHERE slug = $1`, slug).Scan(&reservedReason); err == nil {
		return c.JSON(409, echo.Map{"error": "this vanity is reserved", "reason": reservedReason})
	}

	var existingGuild string
	err := s.db.QueryRow(`SELECT guild_id FROM vanity_urls WHERE slug = $1`, slug).Scan(&existingGuild)
	if err == nil && existingGuild != guildID {
		return c.JSON(409, echo.Map{"error": "vanity already in use by another server"})
	}

	var currentLocked bool
	var currentSlug string
	err = s.db.QueryRow(`SELECT slug, locked FROM vanity_urls WHERE guild_id = $1`, guildID).Scan(&currentSlug, &currentLocked)
	if err == nil && currentLocked {
		return c.JSON(403, echo.Map{"error": "vanity is locked by site admin and cannot be changed"})
	}

	if err == nil {
		_, err = s.db.Exec(`UPDATE vanity_urls SET slug = $1 WHERE guild_id = $2`, slug, guildID)
	} else {
		_, err = s.db.Exec(`INSERT INTO vanity_urls (slug, guild_id, set_by) VALUES ($1, $2, $3)`, slug, guildID, actorID)
	}
	if err != nil {
		return c.JSON(500, echo.Map{"error": "could not set vanity"})
	}

	if s.audit != nil {
		s.audit.RecordGuild(actorID, guildID, auditlog.TargetVanity, slug, auditlog.ActionGuildVanitySet, "",
			map[string]any{"old_slug": currentSlug, "new_slug": slug})
	}

	return c.JSON(200, echo.Map{"slug": slug, "url": vanityURL(c, slug)})
}

func (s *Service) RemoveVanity(c echo.Context) error {
	actorID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	var slug string
	var locked bool
	err := s.db.QueryRow(`SELECT slug, locked FROM vanity_urls WHERE guild_id = $1`, guildID).Scan(&slug, &locked)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "no vanity set"})
	}
	if locked {
		return c.JSON(403, echo.Map{"error": "vanity is locked"})
	}
	if _, err = s.db.Exec(`DELETE FROM vanity_urls WHERE guild_id = $1`, guildID); err != nil {
		return c.JSON(500, echo.Map{"error": "could not remove"})
	}
	if s.audit != nil {
		s.audit.RecordGuild(actorID, guildID, auditlog.TargetVanity, slug, auditlog.ActionGuildVanityRemove, "", nil)
	}
	return c.JSON(200, echo.Map{"removed": true})
}

func (s *Service) AdminForceClearVanity(c echo.Context) error {
	actorID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	var body struct {
		Reason string `json:"reason"`
		Lock   bool   `json:"lock"`
	}
	c.Bind(&body)
	var slug string
	if err := s.db.QueryRow(`SELECT slug FROM vanity_urls WHERE guild_id = $1`, guildID).Scan(&slug); err != nil {
		return c.JSON(404, echo.Map{"error": "no vanity set"})
	}
	if _, err := s.db.Exec(`DELETE FROM vanity_urls WHERE guild_id = $1`, guildID); err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	if body.Lock {
		s.db.Exec(`INSERT INTO reserved_vanities (slug, reason) VALUES ($1, $2) ON CONFLICT DO NOTHING`, slug, "force-cleared by site admin: "+body.Reason)
	}
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetVanity, slug, auditlog.ActionGuildVanityForceClear, body.Reason,
			map[string]any{"guild_id": guildID, "locked": body.Lock})
	}
	return c.JSON(200, echo.Map{"cleared": true})
}

func (s *Service) AdminReserveVanity(c echo.Context) error {
	actorID := c.Get("userID").(string)
	var body struct {
		Slug   string `json:"slug"`
		Reason string `json:"reason"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid body"})
	}
	slug := normalizeSlug(body.Slug)
	if !slugRe.MatchString(slug) {
		return c.JSON(400, echo.Map{"error": "invalid slug"})
	}
	s.db.Exec(`DELETE FROM vanity_urls WHERE slug = $1`, slug)
	if _, err := s.db.Exec(`INSERT INTO reserved_vanities (slug, reason) VALUES ($1, $2) ON CONFLICT DO UPDATE SET reason = EXCLUDED.reason`, slug, body.Reason); err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetVanity, slug, "vanity.reserve", body.Reason, nil)
	}
	return c.JSON(200, echo.Map{"reserved": slug})
}

func (s *Service) AdminListReservedVanity(c echo.Context) error {
	rows, err := s.db.Query(`SELECT slug, reason, created_at FROM reserved_vanities ORDER BY created_at DESC`)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	defer rows.Close()
	out := []echo.Map{}
	for rows.Next() {
		var slug, reason, createdAt string
		rows.Scan(&slug, &reason, &createdAt)
		out = append(out, echo.Map{"slug": slug, "reason": reason, "created_at": createdAt})
	}
	return c.JSON(200, echo.Map{"reserved": out})
}

func (s *Service) resolveVanityToInvite(slug string) (*db.GuildInviteRow, bool) {
	guildID, ok := s.getGuildBySlug(slug)
	if !ok {
		return nil, false
	}
	invs, err := s.db.ListGuildInvites(guildID)
	if err != nil {
		return nil, false
	}
	now := time.Now()
	for i := range invs {
		gi := invs[i]
		if gi.ExpiresAt != nil && now.After(*gi.ExpiresAt) {
			continue
		}
		if gi.MaxUses > 0 && gi.Uses >= gi.MaxUses {
			continue
		}
		return &gi, true
	}
	return nil, false
}

func (s *Service) bumpVanityUseCount(slug string) {
	s.db.Exec(`UPDATE vanity_urls SET use_count = use_count + 1 WHERE slug = $1`, slug)
}