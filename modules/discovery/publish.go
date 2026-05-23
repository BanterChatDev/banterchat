package discovery

import (
	"database/sql"
	"strings"

	"github.com/labstack/echo/v4"
)

type publishRequest struct {
	Slug       string `json:"slug"`
	Bio        string `json:"bio"`
	Tags       string `json:"tags"`
	Language   string `json:"language"`
	NSFW       bool   `json:"nsfw"`
	InviteCode string `json:"invite_code"`
}

func (s *Service) GetListingForGuild(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrForbidden.Error()})
	}
	listing, err := s.getListingByGuild(guildID)
	if err == ErrNotFound {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	if err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	return c.JSON(200, listing)
}

func (s *Service) CheckSlugAvailable(c echo.Context) error {
	guildID := c.Param("guildId")
	raw := c.QueryParam("slug")
	slug := NormalizeSlug(raw)
	if err := ValidateSlug(slug); err != nil {
		return c.JSON(200, echo.Map{"available": false, "reason": err.Error()})
	}
	taken, err := s.slugExists(slug, guildID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	if taken {
		return c.JSON(200, echo.Map{"available": false, "reason": ErrSlugTaken.Error()})
	}
	return c.JSON(200, echo.Map{"available": true})
}

func (s *Service) PutListing(c echo.Context) error {
	guildID := c.Param("guildId")
	var req publishRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	slug := NormalizeSlug(req.Slug)
	if err := ValidateSlug(slug); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if !ValidateBio(req.Bio) {
		return c.JSON(400, echo.Map{"error": "bio too long"})
	}
	inviteCode := strings.TrimSpace(req.InviteCode)
	if inviteCode == "" {
		return c.JSON(400, echo.Map{"error": ErrInviteRequired.Error()})
	}
	inv, err := s.db.GetGuildInviteByCode(inviteCode)
	if err != nil || inv == nil || inv.GuildID != guildID {
		return c.JSON(400, echo.Map{"error": ErrInviteInvalid.Error()})
	}
	taken, err := s.slugExists(slug, guildID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	if taken {
		return c.JSON(409, echo.Map{"error": ErrSlugTaken.Error()})
	}
	tags := strings.Join(NormalizeTags(req.Tags), ",")
	lang := NormalizeLanguage(req.Language)
	bio := strings.TrimSpace(req.Bio)
	listing, err := s.upsertListing(guildID, slug, bio, tags, lang, inviteCode, req.NSFW, true)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	return c.JSON(200, listing)
}

func (s *Service) DeleteListing(c echo.Context) error {
	guildID := c.Param("guildId")
	_, err := s.getListingByGuild(guildID)
	if err == ErrNotFound {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	if err != nil && err != sql.ErrNoRows {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	if err := s.deleteListing(guildID); err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	return c.JSON(200, echo.Map{"ok": true})
}