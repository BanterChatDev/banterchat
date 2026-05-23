package discovery

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/httputil"
	"ror/modules/logger"
)

const bumpCooldown = 2 * time.Hour

type bumpResponse struct {
	BumpedAt  time.Time `json:"bumped_at"`
	BumpCount int       `json:"bump_count"`
	BumpedAgo string    `json:"bumped_ago"`
}

func (s *Service) PublicBump(c echo.Context) error {
	userID := s.auth.SessionUserID(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "sign in to bump listings"})
	}

	slug := c.Param("slug")
	if slug == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "missing slug"})
	}

	listing, err := s.getListingBySlug(slug)
	if err == ErrNotFound {
		return c.JSON(http.StatusNotFound, echo.Map{"error": ErrNotFound.Error()})
	}
	if err != nil {
		logger.Error("bump lookup failed", "slug", slug, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	cooldownSec, err := s.userBumpCooldown(userID)
	if err != nil {
		logger.Error("bump cooldown check failed", "user_id", userID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}
	if cooldownSec > 0 {
		return c.JSON(http.StatusTooManyRequests, echo.Map{
			"error":            ErrBumpCooldown.Error(),
			"cooldown_seconds": cooldownSec,
		})
	}

	tx, err := s.db.Begin()
	if err != nil {
		logger.Error("bump tx begin failed", "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}
	defer tx.Rollback()

	var newBumpedAt time.Time
	var newBumpCount int
	err = tx.QueryRow(`
		UPDATE guild_listings
		SET bumped_at = NOW(), bump_count = bump_count + 1
		WHERE guild_id = $1
		RETURNING bumped_at, bump_count
	`, listing.GuildID).Scan(&newBumpedAt, &newBumpCount)
	if err != nil {
		logger.Error("bump update failed", "guild_id", listing.GuildID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	if _, err := tx.Exec(
		`INSERT INTO guild_listing_bumps (guild_id, user_id, bumped_at) VALUES ($1, $2, NOW())`,
		listing.GuildID, userID,
	); err != nil {
		logger.Error("bump audit insert failed", "guild_id", listing.GuildID, "user_id", userID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	if err := tx.Commit(); err != nil {
		logger.Error("bump tx commit failed", "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	return c.JSON(http.StatusOK, bumpResponse{
		BumpedAt:  newBumpedAt,
		BumpCount: newBumpCount,
		BumpedAgo: httputil.HumanAgo(newBumpedAt),
	})
}

// userBumpCooldown returns the number of seconds remaining on this user's
// global bump cooldown (2 hours since their most recent bump, across all
// guilds). Returns 0 when they have never bumped or the cooldown has
// already elapsed. Called from both PublicBump (before allowing a bump)
// and HandleListingPage (to SSR the initial cooldown state so the
// countdown persists across reloads without a client-side fetch).
func (s *Service) userBumpCooldown(userID string) (int, error) {
	if userID == "" {
		return 0, nil
	}
	var lastBump sql.NullTime
	err := s.db.QueryRow(
		`SELECT MAX(bumped_at) FROM guild_listing_bumps WHERE user_id = $1`,
		userID,
	).Scan(&lastBump)
	if err != nil && err != sql.ErrNoRows {
		return 0, err
	}
	if !lastBump.Valid {
		return 0, nil
	}
	remaining := bumpCooldown - time.Since(lastBump.Time)
	if remaining <= 0 {
		return 0, nil
	}
	return int(remaining.Seconds()), nil
}