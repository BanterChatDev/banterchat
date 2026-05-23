package db

import "time"

type CategoryRow struct {
	ID        string
	GuildID   string
	Name      string
	Position  int
	CreatedBy string
	CreatedAt time.Time
}

type CategoryPermRow struct {
	CategoryID string
	RoleID     string
	RoleName   string
	RoleColor  string
	Allow      int64
	Deny       int64
}

func (d *DB) ListCategoriesByGuild(guildID string) ([]CategoryRow, error) {
	rows, err := d.Query(`SELECT id, COALESCE(guild_id,''), name, position, created_by, created_at FROM categories WHERE guild_id = $1 ORDER BY position ASC, created_at ASC`, guildID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []CategoryRow
	for rows.Next() {
		var c CategoryRow
		if rows.Scan(&c.ID, &c.GuildID, &c.Name, &c.Position, &c.CreatedBy, &c.CreatedAt) == nil { out = append(out, c) }
	}
	return out, nil
}

// GetCategoryGuildID returns the guild_id for a category, or "" if none.
func (d *DB) GetCategoryGuildID(categoryID string) string {
	var gid string
	d.QueryRow(`SELECT COALESCE(guild_id,'') FROM categories WHERE id = $1`, categoryID).Scan(&gid)
	return gid
}

// MaxCategoryPositionInGuild returns the max position within a guild, for
// appending a new category at the bottom.
func (d *DB) MaxCategoryPositionInGuild(guildID string) int {
	var p int
	d.QueryRow(`SELECT COALESCE(MAX(position),0) FROM categories WHERE guild_id = $1`, guildID).Scan(&p)
	return p
}

func (d *DB) GetCategory(id string) (*CategoryRow, error) {
	c := &CategoryRow{}
	err := d.QueryRow(`SELECT id, COALESCE(guild_id,''), name, position, created_by, created_at FROM categories WHERE id = $1`, id).Scan(&c.ID, &c.GuildID, &c.Name, &c.Position, &c.CreatedBy, &c.CreatedAt)
	if err != nil { return nil, err }
	return c, nil
}

func (d *DB) MaxCategoryPosition() int {
	var p int
	d.QueryRow(`SELECT COALESCE(MAX(position),0) FROM categories`).Scan(&p)
	return p
}

func (d *DB) InsertCategory(id, name, nameHash string, position int, createdBy string) error {
	_, err := d.Exec(`INSERT INTO categories (id, name, name_hash, position, created_by) VALUES ($1, $2, $3, $4, $5)`, id, name, nameHash, position, createdBy)
	return err
}

// InsertCategoryInGuild inserts with guild_id. Phase 3 migrates callers.
func (d *DB) InsertCategoryInGuild(id, guildID, name, nameHash string, position int, createdBy string) error {
	_, err := d.Exec(`INSERT INTO categories (id, guild_id, name, name_hash, position, created_by) VALUES ($1, $2, $3, $4, $5, $6)`, id, guildID, name, nameHash, position, createdBy)
	return err
}

func (d *DB) UpdateCategory(id, name, nameHash string, position int) error {
	_, err := d.Exec(`UPDATE categories SET name = $1, name_hash = $2, position = $3 WHERE id = $4`, name, nameHash, position, id)
	return err
}

func (d *DB) ReorderCategories(items []struct{ ID string; Position int }) error {
	tx, err := d.Begin()
	if err != nil { return err }
	stmt, err := tx.Prepare(`UPDATE categories SET position = $1 WHERE id = $2`)
	if err != nil { tx.Rollback(); return err }
	defer stmt.Close()
	for _, item := range items {
		if _, err := stmt.Exec(item.Position, item.ID); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func (d *DB) DeleteCategory(id string) error {
	d.Exec(`UPDATE channels SET category_id = '' WHERE category_id = $1`, id)
	_, err := d.Exec(`DELETE FROM categories WHERE id = $1`, id)
	return err
}

func (d *DB) GetCategoryPerms(categoryID string) ([]CategoryPermRow, error) {
	rows, err := d.Query(`SELECT cp.category_id, cp.role_id, r.name, r.color, cp.allow, cp.deny FROM category_permissions cp JOIN roles r ON cp.role_id = r.id WHERE cp.category_id = $1 ORDER BY r.position ASC`, categoryID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []CategoryPermRow
	for rows.Next() {
		var p CategoryPermRow
		if rows.Scan(&p.CategoryID, &p.RoleID, &p.RoleName, &p.RoleColor, &p.Allow, &p.Deny) == nil { out = append(out, p) }
	}
	return out, nil
}

func (d *DB) SetCategoryPerm(categoryID, roleID string, allow, deny int64) error {
	if allow == 0 && deny == 0 {
		_, err := d.Exec(`DELETE FROM category_permissions WHERE category_id = $1 AND role_id = $2`, categoryID, roleID)
		return err
	}
	_, err := d.Exec(`INSERT INTO category_permissions (category_id, role_id, allow, deny) VALUES ($1, $2, $3, $4) ON CONFLICT(category_id, role_id) DO UPDATE SET allow = excluded.allow, deny = excluded.deny`, categoryID, roleID, allow, deny)
	return err
}