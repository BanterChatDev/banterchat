package discovery

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/logger"
)

type adminListingRow struct {
	GuildID     string  `json:"guild_id"`
	GuildName   string  `json:"guild_name"`
	Slug        string  `json:"slug"`
	Bio         string  `json:"bio"`
	NSFW        bool    `json:"nsfw"`
	Published   bool    `json:"published"`
	MemberCount int     `json:"member_count"`
	BumpCount   int     `json:"bump_count"`
	RatingAvg   float64 `json:"rating_avg"`
	RatingCount int     `json:"rating_count"`
	ListedAt    string  `json:"listed_at"`
}

type adminListResponse struct {
	Listings []adminListingRow `json:"listings"`
	Total    int               `json:"total"`
}

func (s *Service) AdminListListings(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	if offset < 0 {
		offset = 0
	}
	search := strings.TrimSpace(c.QueryParam("search"))

	var total int
	countQ := `SELECT COUNT(*) FROM guild_listings l JOIN guilds g ON g.id = l.guild_id`
	countArgs := []interface{}{}
	filter := ""
	if search != "" {
		filter = ` WHERE l.slug ILIKE $1 OR l.bio ILIKE $1`
		countArgs = append(countArgs, "%"+search+"%")
	}
	if err := s.db.QueryRow(countQ+filter, countArgs...).Scan(&total); err != nil {
		logger.Error("admin listings count failed", "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}

	listQ := `SELECT l.guild_id, g.name, l.slug, l.bio, l.nsfw, l.published,
		l.bump_count, l.rating_avg, l.rating_count, l.listed_at
		FROM guild_listings l JOIN guilds g ON g.id = l.guild_id` +
		filter + ` ORDER BY l.listed_at DESC LIMIT $` +
		strconv.Itoa(len(countArgs)+1) + ` OFFSET $` + strconv.Itoa(len(countArgs)+2)
	args := append(countArgs, limit, offset)

	rows, err := s.db.Query(listQ, args...)
	if err != nil {
		logger.Error("admin listings query failed", "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}
	defer rows.Close()

	out := []adminListingRow{}
	for rows.Next() {
		var r adminListingRow
		var encName string
		if err := rows.Scan(&r.GuildID, &encName, &r.Slug, &r.Bio, &r.NSFW, &r.Published,
			&r.BumpCount, &r.RatingAvg, &r.RatingCount, &r.ListedAt); err != nil {
			continue
		}
		r.GuildName = s.decryptField(encName)
		r.MemberCount = s.db.CountGuildMembers(r.GuildID)
		out = append(out, r)
	}
	return c.JSON(http.StatusOK, adminListResponse{Listings: out, Total: total})
}

func (s *Service) AdminUnlistListing(c echo.Context) error {
	guildID := c.Param("guildId")
	if guildID == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "missing guild id"})
	}
	if _, err := s.getListingByGuild(guildID); err == ErrNotFound {
		return c.JSON(http.StatusNotFound, echo.Map{"error": ErrNotFound.Error()})
	} else if err != nil {
		logger.Error("admin unlist lookup failed", "guild_id", guildID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}
	if err := s.deleteListing(guildID); err != nil {
		logger.Error("admin unlist delete failed", "guild_id", guildID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "server error"})
	}
	return c.JSON(http.StatusOK, echo.Map{"ok": true})
}