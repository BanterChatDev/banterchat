package discovery

import (
	"database/sql"
	"strings"
	"time"
)

type ListingCard struct {
	GuildID     string
	Slug        string
	Bio         string
	Tags        []string
	Language    string
	NSFW        bool
	InviteCode  string
	BumpedAt    time.Time
	BumpCount   int
	RatingAvg   float64
	RatingCount int
	GuildName   string
	Icon        string
	Banner      string
	MemberCount int
}

const cardCols = `l.guild_id, l.slug, l.bio, l.tags, l.language, l.nsfw, l.invite_code, l.bumped_at, l.bump_count, l.rating_avg, l.rating_count, g.name, g.icon, COALESCE(g.banner, '')`

func (s *Service) scanCards(rows *sql.Rows) ([]ListingCard, error) {
	out := []ListingCard{}
	for rows.Next() {
		var c ListingCard
		var tagsStr string
		if err := rows.Scan(&c.GuildID, &c.Slug, &c.Bio, &tagsStr, &c.Language, &c.NSFW, &c.InviteCode, &c.BumpedAt, &c.BumpCount, &c.RatingAvg, &c.RatingCount, &c.GuildName, &c.Icon, &c.Banner); err != nil {
			continue
		}
		c.GuildName = s.decryptField(c.GuildName)
		c.Tags = splitTags(tagsStr)
		c.MemberCount = s.db.CountGuildMembers(c.GuildID)
		out = append(out, c)
	}
	return out, nil
}

func splitTags(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func (s *Service) listRecent(showNSFW bool, limit int) ([]ListingCard, error) {
	q := `SELECT ` + cardCols + ` FROM guild_listings l JOIN guilds g ON g.id = l.guild_id WHERE l.published = true`
	if !showNSFW {
		q += ` AND l.nsfw = false`
	}
	q += ` ORDER BY l.bumped_at DESC LIMIT $1`
	rows, err := s.db.Query(q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanCards(rows)
}

func (s *Service) listByTag(tag string, showNSFW bool, limit int) ([]ListingCard, error) {
	q := `SELECT ` + cardCols + ` FROM guild_listings l JOIN guilds g ON g.id = l.guild_id WHERE l.published = true AND l.search_tag_tsv @@ plainto_tsquery('simple', $1)`
	if !showNSFW {
		q += ` AND l.nsfw = false`
	}
	q += ` ORDER BY l.bumped_at DESC LIMIT $2`
	rows, err := s.db.Query(q, tag, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanCards(rows)
}

func (s *Service) searchListings(query string, showNSFW bool, limit int) ([]ListingCard, error) {
	q := `SELECT ` + cardCols + `,
		ts_rank(l.search_name_tsv, plainto_tsquery('simple', $1)) * 5 +
		ts_rank(l.search_tag_tsv,  plainto_tsquery('simple', $1)) * 3 +
		ts_rank(l.search_bio_tsv,  plainto_tsquery('english', $1)) AS rank
		FROM guild_listings l JOIN guilds g ON g.id = l.guild_id
		WHERE l.published = true
		  AND (l.search_name_tsv @@ plainto_tsquery('simple', $1)
		    OR l.search_tag_tsv  @@ plainto_tsquery('simple', $1)
		    OR l.search_bio_tsv  @@ plainto_tsquery('english', $1)
		    OR l.guild_name ILIKE '%' || $1 || '%')`
	if !showNSFW {
		q += ` AND l.nsfw = false`
	}
	q += ` ORDER BY rank DESC, l.bumped_at DESC LIMIT $2`
	rows, err := s.db.Query(q, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ListingCard{}
	for rows.Next() {
		var c ListingCard
		var tagsStr string
		var rank float64
		if err := rows.Scan(&c.GuildID, &c.Slug, &c.Bio, &tagsStr, &c.Language, &c.NSFW, &c.InviteCode, &c.BumpedAt, &c.BumpCount, &c.RatingAvg, &c.RatingCount, &c.GuildName, &c.Icon, &c.Banner, &rank); err != nil {
			continue
		}
		c.GuildName = s.decryptField(c.GuildName)
		c.Tags = splitTags(tagsStr)
		c.MemberCount = s.db.CountGuildMembers(c.GuildID)
		out = append(out, c)
	}
	return out, nil
}

func (s *Service) listAllForSitemap() ([]ListingCard, error) {
	rows, err := s.db.Query(`SELECT ` + cardCols + ` FROM guild_listings l JOIN guilds g ON g.id = l.guild_id WHERE l.published = true ORDER BY l.updated_at DESC LIMIT 50000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanCards(rows)
}

func (s *Service) popularTags(showNSFW bool, limit int) ([]string, error) {
	q := `SELECT tag FROM (
		SELECT unnest(string_to_array(tags, ',')) AS tag
		FROM guild_listings
		WHERE published = true`
	args := []interface{}{}
	if !showNSFW {
		q += ` AND nsfw = false`
	}
	q += `) t WHERE tag <> '' GROUP BY tag ORDER BY COUNT(*) DESC LIMIT $1`
	args = append(args, limit)
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err == nil {
			t = strings.TrimSpace(t)
			if t != "" {
				out = append(out, t)
			}
		}
	}
	return out, nil
}