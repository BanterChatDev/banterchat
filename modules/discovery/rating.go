package discovery

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"ror/modules/logger"
)

type rateRequest struct {
	Stars int `json:"stars"`
}

type rateResponse struct {
	RatingAvg   float64 `json:"rating_avg"`
	RatingCount int     `json:"rating_count"`
	YourStars   int     `json:"your_stars"`
}

func (s *Service) PublicRate(c echo.Context) error {
	userID := s.auth.SessionUserID(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "sign in to rate listings"})
	}

	slug := c.Param("slug")
	if slug == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "missing slug"})
	}

	var req rateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request"})
	}
	if req.Stars < 1 || req.Stars > 5 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": ErrRatingInvalid.Error()})
	}

	listing, err := s.getListingBySlug(slug)
	if err == ErrNotFound {
		return c.JSON(http.StatusNotFound, echo.Map{"error": ErrNotFound.Error()})
	}
	if err != nil {
		logger.Error("rating lookup failed", "slug", slug, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	tx, err := s.db.Begin()
	if err != nil {
		logger.Error("rating tx begin failed", "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
		INSERT INTO guild_listing_ratings (guild_id, user_id, stars)
		VALUES ($1, $2, $3)
		ON CONFLICT (guild_id, user_id) DO UPDATE SET
			stars = EXCLUDED.stars,
			updated_at = NOW()
	`, listing.GuildID, userID, req.Stars); err != nil {
		logger.Error("rating upsert failed", "guild_id", listing.GuildID, "user_id", userID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	var avg float64
	var count int
	if err := tx.QueryRow(`
		UPDATE guild_listings
		SET rating_avg = (SELECT COALESCE(AVG(stars), 0) FROM guild_listing_ratings WHERE guild_id = $1),
		    rating_count = (SELECT COUNT(*) FROM guild_listing_ratings WHERE guild_id = $1)
		WHERE guild_id = $1
		RETURNING rating_avg, rating_count
	`, listing.GuildID).Scan(&avg, &count); err != nil {
		logger.Error("rating aggregate failed", "guild_id", listing.GuildID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	if err := tx.Commit(); err != nil {
		logger.Error("rating tx commit failed", "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	return c.JSON(http.StatusOK, rateResponse{
		RatingAvg:   avg,
		RatingCount: count,
		YourStars:   req.Stars,
	})
}

// userRatingStars returns the star count (1-5) this user has given the
// specified guild, or 0 if they've never rated it. Called from SSR page
// render to pre-populate the star widget without a client round trip.
func (s *Service) userRatingStars(guildID, userID string) int {
	if guildID == "" || userID == "" {
		return 0
	}
	var stars int
	err := s.db.QueryRow(
		`SELECT stars FROM guild_listing_ratings WHERE guild_id = $1 AND user_id = $2`,
		guildID, userID,
	).Scan(&stars)
	if err != nil {
		return 0
	}
	return stars
}