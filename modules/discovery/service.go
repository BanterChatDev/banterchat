package discovery

import (
	"html/template"
	"strings"

	"ror/modules/auth"
	"ror/modules/db"
)

type Templates struct {
	Listing *template.Template
}

type Service struct {
	db     *db.DB
	domain string
	auth   *auth.Service
	tmpl   *Templates
}

func NewService(dbConn *db.DB, domain string, authSvc *auth.Service) *Service {
	return &Service{db: dbConn, domain: domain, auth: authSvc}
}

func (s *Service) SetTemplates(t *Templates) {
	s.tmpl = t
}

func (s *Service) MainHost() string {
	return strings.TrimSpace(s.domain)
}

// BackfillGuildNames populates guild_name + search_name_tsv for any
// published listings that predate the name-search feature. Idempotent:
// scans rows where guild_name = '', decrypts the real name from the
// guilds row, and writes it back. Called once at startup. After the
// column is populated, upsertListing keeps it in sync on every publish.
func (s *Service) BackfillGuildNames() error {
	rows, err := s.db.Query(`SELECT guild_id FROM guild_listings WHERE guild_name = ''`)
	if err != nil {
		return err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	for _, guildID := range ids {
		g, gerr := s.db.GetGuild(guildID)
		if gerr != nil || g == nil {
			continue
		}
		name := s.decryptField(g.Name)
		if name == "" {
			continue
		}
		_, _ = s.db.Exec(
			`UPDATE guild_listings SET guild_name = $1, search_name_tsv = to_tsvector('simple', $1) WHERE guild_id = $2`,
			name, guildID,
		)
	}
	return nil
}

func (s *Service) SubdomainHost() string {
	d := strings.TrimSpace(s.domain)
	if d == "" {
		return ""
	}
	return "guilds." + d
}