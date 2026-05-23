package db

import "time"

type GifTabRow struct {
	ID        string    `json:"id"`
	UserID    string    `json:"-"`
	Name      string    `json:"name"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}

type GifFavoriteRow struct {
	ID          string    `json:"id"`
	UserID      string    `json:"-"`
	TabID       string    `json:"tab_id,omitempty"`
	TenorID     string    `json:"tenor_id"`
	URL         string    `json:"url"`
	PreviewURL  string    `json:"preview_url"`
	Width       int       `json:"width"`
	Height      int       `json:"height"`
	Description string    `json:"description,omitempty"`
	SavedAt     time.Time `json:"saved_at"`
}

func (d *DB) ListGifTabs(userID string) []GifTabRow {
	rows, err := d.Query(`SELECT id, user_id, name, position, created_at FROM gif_tabs WHERE user_id = $1 ORDER BY position ASC, created_at ASC`, userID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []GifTabRow{}
	for rows.Next() {
		var r GifTabRow
		if rows.Scan(&r.ID, &r.UserID, &r.Name, &r.Position, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out
}

func (d *DB) CreateGifTab(id, userID, name string, position int) error {
	_, err := d.Exec(`INSERT INTO gif_tabs (id, user_id, name, position) VALUES ($1, $2, $3, $4)`, id, userID, name, position)
	return err
}

func (d *DB) RenameGifTab(id, userID, name string) error {
	_, err := d.Exec(`UPDATE gif_tabs SET name = $1 WHERE id = $2 AND user_id = $3`, name, id, userID)
	return err
}

func (d *DB) DeleteGifTab(id, userID string) error {
	_, err := d.Exec(`DELETE FROM gif_tabs WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (d *DB) CountGifTabs(userID string) int {
	var n int
	d.QueryRow(`SELECT COUNT(*) FROM gif_tabs WHERE user_id = $1`, userID).Scan(&n)
	return n
}

func (d *DB) ListGifFavorites(userID, tabID string) []GifFavoriteRow {
	var rows interface {
		Next() bool
		Scan(...interface{}) error
		Close() error
	}
	var err error
	if tabID == "" {
		r, e := d.Query(`SELECT id, user_id, COALESCE(tab_id,''), tenor_id, url, preview_url, width, height, description, saved_at FROM gif_favorites WHERE user_id = $1 ORDER BY saved_at DESC`, userID)
		rows, err = r, e
	} else {
		r, e := d.Query(`SELECT id, user_id, COALESCE(tab_id,''), tenor_id, url, preview_url, width, height, description, saved_at FROM gif_favorites WHERE user_id = $1 AND tab_id = $2 ORDER BY saved_at DESC`, userID, tabID)
		rows, err = r, e
	}
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []GifFavoriteRow{}
	for rows.Next() {
		var r GifFavoriteRow
		if rows.Scan(&r.ID, &r.UserID, &r.TabID, &r.TenorID, &r.URL, &r.PreviewURL, &r.Width, &r.Height, &r.Description, &r.SavedAt) == nil {
			out = append(out, r)
		}
	}
	return out
}

func (d *DB) AddGifFavorite(id, userID, tabID, tenorID, url, previewURL string, width, height int, description string) error {
	var tab interface{}
	if tabID == "" {
		tab = nil
	} else {
		tab = tabID
	}
	_, err := d.Exec(`INSERT INTO gif_favorites (id, user_id, tab_id, tenor_id, url, preview_url, width, height, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (user_id, tenor_id, tab_id) DO NOTHING`, id, userID, tab, tenorID, url, previewURL, width, height, description)
	return err
}

func (d *DB) FindGifFavoriteByTenor(userID, tenorID string) (string, error) {
	var favID string
	err := d.QueryRow(`SELECT id FROM gif_favorites WHERE user_id = $1 AND tenor_id = $2 ORDER BY saved_at ASC LIMIT 1`, userID, tenorID).Scan(&favID)
	return favID, err
}

func (d *DB) GetGifFavoriteTenor(favID, userID string) (string, error) {
	var tenorID string
	err := d.QueryRow(`SELECT tenor_id FROM gif_favorites WHERE id = $1 AND user_id = $2`, favID, userID).Scan(&tenorID)
	return tenorID, err
}

func (d *DB) DeleteGifFavorite(id, userID string) error {
	_, err := d.Exec(`DELETE FROM gif_favorites WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (d *DB) MoveGifFavorite(id, userID, tabID string) error {
	var tab interface{}
	if tabID == "" {
		tab = nil
	} else {
		tab = tabID
	}
	_, err := d.Exec(`UPDATE gif_favorites SET tab_id = $1 WHERE id = $2 AND user_id = $3`, tab, id, userID)
	return err
}

func (d *DB) CountGifFavorites(userID string) int {
	var n int
	d.QueryRow(`SELECT COUNT(*) FROM gif_favorites WHERE user_id = $1`, userID).Scan(&n)
	return n
}

func (d *DB) IsGifTabOwner(tabID, userID string) bool {
	var n int
	d.QueryRow(`SELECT COUNT(*) FROM gif_tabs WHERE id = $1 AND user_id = $2`, tabID, userID).Scan(&n)
	return n > 0
}