package discovery

import (
	"database/sql"
	"time"
)

type Listing struct {
	GuildID     string    `json:"guild_id"`
	Slug        string    `json:"slug"`
	Bio         string    `json:"bio"`
	Tags        string    `json:"tags"`
	Language    string    `json:"language"`
	NSFW        bool      `json:"nsfw"`
	InviteCode  string    `json:"invite_code"`
	Published   bool      `json:"published"`
	BumpedAt    time.Time `json:"bumped_at"`
	BumpCount   int       `json:"bump_count"`
	RatingAvg   float64   `json:"rating_avg"`
	RatingCount int       `json:"rating_count"`
	ListedAt    time.Time `json:"listed_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

const listingCols = `guild_id, slug, bio, tags, language, nsfw, invite_code, published, bumped_at, bump_count, rating_avg, rating_count, listed_at, updated_at`

func scanListing(row interface{ Scan(...interface{}) error }) (*Listing, error) {
	l := &Listing{}
	err := row.Scan(&l.GuildID, &l.Slug, &l.Bio, &l.Tags, &l.Language, &l.NSFW, &l.InviteCode, &l.Published, &l.BumpedAt, &l.BumpCount, &l.RatingAvg, &l.RatingCount, &l.ListedAt, &l.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return l, nil
}

func (s *Service) getListingByGuild(guildID string) (*Listing, error) {
	row := s.db.QueryRow(`SELECT `+listingCols+` FROM guild_listings WHERE guild_id = $1`, guildID)
	l, err := scanListing(row)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return l, err
}

func (s *Service) getListingBySlug(slug string) (*Listing, error) {
	row := s.db.QueryRow(`SELECT `+listingCols+` FROM guild_listings WHERE slug = $1`, slug)
	l, err := scanListing(row)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return l, err
}

func (s *Service) slugExists(slug, excludeGuildID string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM guild_listings WHERE slug = $1 AND guild_id <> $2)`, slug, excludeGuildID).Scan(&exists)
	return exists, err
}

func (s *Service) upsertListing(guildID, slug, bio, tags, language, inviteCode string, nsfw, published bool) (*Listing, error) {
	guildName := ""
	if g, gerr := s.db.GetGuild(guildID); gerr == nil && g != nil {
		guildName = s.decryptField(g.Name)
	}
	_, err := s.db.Exec(`
		INSERT INTO guild_listings (guild_id, slug, guild_name, bio, tags, language, nsfw, invite_code, published, updated_at, search_name_tsv, search_bio_tsv, search_tag_tsv)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), to_tsvector('simple', $10), to_tsvector('english', $11), to_tsvector('simple', $12))
		ON CONFLICT (guild_id) DO UPDATE SET
			slug = EXCLUDED.slug,
			guild_name = EXCLUDED.guild_name,
			bio = EXCLUDED.bio,
			tags = EXCLUDED.tags,
			language = EXCLUDED.language,
			nsfw = EXCLUDED.nsfw,
			invite_code = EXCLUDED.invite_code,
			published = EXCLUDED.published,
			updated_at = NOW(),
			search_name_tsv = EXCLUDED.search_name_tsv,
			search_bio_tsv = EXCLUDED.search_bio_tsv,
			search_tag_tsv = EXCLUDED.search_tag_tsv
	`, guildID, slug, guildName, bio, tags, language, nsfw, inviteCode, published, guildName, bio, tags)
	if err != nil {
		return nil, err
	}
	return s.getListingByGuild(guildID)
}

func (s *Service) deleteListing(guildID string) error {
	_, err := s.db.Exec(`DELETE FROM guild_listings WHERE guild_id = $1`, guildID)
	return err
}