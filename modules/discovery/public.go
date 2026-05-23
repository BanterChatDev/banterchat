package discovery

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/httputil"
)

type publicListing struct {
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Bio         string   `json:"bio"`
	Tags        []string `json:"tags"`
	Language    string   `json:"language"`
	NSFW        bool     `json:"nsfw"`
	IconURL     string   `json:"icon_url,omitempty"`
	BannerURL   string   `json:"banner_url,omitempty"`
	Initials    string   `json:"initials"`
	MemberCount int      `json:"member_count"`
	BumpedAgo   string   `json:"bumped_ago"`
	BumpCount   int      `json:"bump_count"`
	RatingAvg   float64  `json:"rating_avg"`
	RatingCount int      `json:"rating_count"`
}

type publicListResponse struct {
	Listings []publicListing `json:"listings"`
	TopTags  []string        `json:"top_tags,omitempty"`
}

func (s *Service) cardToPublic(c echo.Context, card ListingCard) publicListing {
	p := publicListing{
		Slug:        card.Slug,
		Name:        card.GuildName,
		Bio:         card.Bio,
		Tags:        card.Tags,
		Language:    card.Language,
		NSFW:        card.NSFW,
		Initials:    httputil.InitialsOf(card.GuildName),
		MemberCount: card.MemberCount,
		BumpedAgo:   httputil.HumanAgo(card.BumpedAt),
		BumpCount:   card.BumpCount,
		RatingAvg:   card.RatingAvg,
		RatingCount: card.RatingCount,
	}
	if card.Icon != "" {
		p.IconURL = s.mainAbsURL(c, "/api/v1/guild-avatars/"+card.Icon)
	}
	if card.Banner != "" {
		p.BannerURL = s.mainAbsURL(c, "/api/v1/guild-banners/"+card.Banner)
	}
	return p
}

func (s *Service) cardsToPublic(c echo.Context, cards []ListingCard) []publicListing {
	out := make([]publicListing, 0, len(cards))
	for _, cd := range cards {
		out = append(out, s.cardToPublic(c, cd))
	}
	return out
}

func (s *Service) PublicListRecent(c echo.Context) error {
	showNSFW := nsfwOptedIn(c)
	cards, err := s.listRecent(showNSFW, 60)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to load listings"})
	}
	tags, _ := s.popularTags(showNSFW, 20)
	return c.JSON(http.StatusOK, publicListResponse{
		Listings: s.cardsToPublic(c, cards),
		TopTags:  tags,
	})
}

func (s *Service) PublicSearch(c echo.Context) error {
	q := strings.TrimSpace(c.QueryParam("q"))
	if q == "" || len(q) > 100 {
		return c.JSON(http.StatusOK, publicListResponse{Listings: []publicListing{}})
	}
	showNSFW := nsfwOptedIn(c)
	cards, err := s.searchListings(q, showNSFW, 60)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "search failed"})
	}
	return c.JSON(http.StatusOK, publicListResponse{Listings: s.cardsToPublic(c, cards)})
}

func (s *Service) PublicByTag(c echo.Context) error {
	tag := strings.ToLower(strings.TrimSpace(c.Param("tag")))
	if tag == "" || len(tag) > 24 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid tag"})
	}
	showNSFW := nsfwOptedIn(c)
	cards, err := s.listByTag(tag, showNSFW, 60)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to load tag listings"})
	}
	return c.JSON(http.StatusOK, publicListResponse{Listings: s.cardsToPublic(c, cards)})
}