package db

import (
	"time"
)

type BotAppRow struct {
	ID          string
	OwnerID     string
	BotUserID   string
	Name        string
	Description string
	TokenHash   string
	Verified    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type BotCommandRow struct {
	ID                 string
	BotUserID          string
	GuildID            string
	Name               string
	Description        string
	ArgsJSON           string
	PermissionRequired int64
	CreatedAt          time.Time
}

func (d *DB) InsertBotApp(id, ownerID, botUserID, name, tokenHash string) error {
	_, err := d.Exec(
		`INSERT INTO bot_applications (id, owner_id, bot_user_id, name, token_hash) VALUES ($1, $2, $3, $4, $5)`,
		id, ownerID, botUserID, name, tokenHash,
	)
	return err
}

func (d *DB) GetBotAppByID(id string) (*BotAppRow, error) {
	row := &BotAppRow{}
	err := d.QueryRow(
		`SELECT id, owner_id, bot_user_id, name, description, token_hash, verified, created_at, updated_at FROM bot_applications WHERE id = $1`,
		id,
	).Scan(&row.ID, &row.OwnerID, &row.BotUserID, &row.Name, &row.Description, &row.TokenHash, &row.Verified, &row.CreatedAt, &row.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return row, nil
}

func (d *DB) GetBotAppByTokenHash(tokenHash string) (*BotAppRow, error) {
	row := &BotAppRow{}
	err := d.QueryRow(
		`SELECT id, owner_id, bot_user_id, name, description, token_hash, verified, created_at, updated_at FROM bot_applications WHERE token_hash = $1`,
		tokenHash,
	).Scan(&row.ID, &row.OwnerID, &row.BotUserID, &row.Name, &row.Description, &row.TokenHash, &row.Verified, &row.CreatedAt, &row.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return row, nil
}

func (d *DB) GetBotAppByBotUserID(botUserID string) (*BotAppRow, error) {
	row := &BotAppRow{}
	err := d.QueryRow(
		`SELECT id, owner_id, bot_user_id, name, description, token_hash, verified, created_at, updated_at FROM bot_applications WHERE bot_user_id = $1`,
		botUserID,
	).Scan(&row.ID, &row.OwnerID, &row.BotUserID, &row.Name, &row.Description, &row.TokenHash, &row.Verified, &row.CreatedAt, &row.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return row, nil
}

func (d *DB) ListBotAppsByOwner(ownerID string) ([]BotAppRow, error) {
	rows, err := d.Query(
		`SELECT id, owner_id, bot_user_id, name, description, token_hash, verified, created_at, updated_at FROM bot_applications WHERE owner_id = $1 ORDER BY created_at ASC`,
		ownerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BotAppRow{}
	for rows.Next() {
		var r BotAppRow
		if rows.Scan(&r.ID, &r.OwnerID, &r.BotUserID, &r.Name, &r.Description, &r.TokenHash, &r.Verified, &r.CreatedAt, &r.UpdatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) CountBotAppsByOwner(ownerID string) (int, error) {
	var n int
	err := d.QueryRow(`SELECT COUNT(*) FROM bot_applications WHERE owner_id = $1`, ownerID).Scan(&n)
	return n, err
}

func (d *DB) ListAllBotApps() ([]BotAppRow, error) {
	rows, err := d.Query(`SELECT id, owner_id, bot_user_id, name, description, token_hash, verified, created_at, updated_at FROM bot_applications ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BotAppRow{}
	for rows.Next() {
		var r BotAppRow
		if rows.Scan(&r.ID, &r.OwnerID, &r.BotUserID, &r.Name, &r.Description, &r.TokenHash, &r.Verified, &r.CreatedAt, &r.UpdatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) UpdateBotAppName(id, name, description string) error {
	_, err := d.Exec(
		`UPDATE bot_applications SET name = $2, description = $3, updated_at = NOW() WHERE id = $1`,
		id, name, description,
	)
	return err
}

func (d *DB) UpdateBotAppTokenHash(id, tokenHash string) error {
	_, err := d.Exec(
		`UPDATE bot_applications SET token_hash = $2, updated_at = NOW() WHERE id = $1`,
		id, tokenHash,
	)
	return err
}

func (d *DB) DeleteBotApp(id string) error {
	_, err := d.Exec(`DELETE FROM bot_applications WHERE id = $1`, id)
	return err
}

func (d *DB) InsertBotCommand(id, botUserID, guildID, name, description, argsJSON string, permissionRequired int64) error {
	_, err := d.Exec(
		`INSERT INTO bot_commands (id, bot_user_id, guild_id, name, description, args_json, permission_required) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, botUserID, guildID, name, description, argsJSON, permissionRequired,
	)
	return err
}

func (d *DB) DeleteBotCommandsByBotGuild(botUserID, guildID string) error {
	_, err := d.Exec(`DELETE FROM bot_commands WHERE bot_user_id = $1 AND guild_id = $2`, botUserID, guildID)
	return err
}

func (d *DB) ListGlobalBotCommandsByBot(botUserID string) ([]BotCommandRow, error) {
	rows, err := d.Query(
		`SELECT id, bot_user_id, guild_id, name, description, args_json, permission_required, created_at FROM bot_commands WHERE bot_user_id = $1 AND guild_id = '' ORDER BY name ASC`,
		botUserID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BotCommandRow{}
	for rows.Next() {
		var r BotCommandRow
		if rows.Scan(&r.ID, &r.BotUserID, &r.GuildID, &r.Name, &r.Description, &r.ArgsJSON, &r.PermissionRequired, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) ListGuildResolvedCommands(guildID string) ([]BotCommandRow, error) {
	rows, err := d.Query(
		`SELECT c.id, c.bot_user_id, c.guild_id, c.name, c.description, c.args_json, c.permission_required, c.created_at
		 FROM bot_commands c
		 JOIN guild_members m ON m.user_id = c.bot_user_id AND m.guild_id = $1
		 WHERE c.guild_id = '' OR c.guild_id = $1
		 ORDER BY c.name ASC`,
		guildID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BotCommandRow{}
	for rows.Next() {
		var r BotCommandRow
		if rows.Scan(&r.ID, &r.BotUserID, &r.GuildID, &r.Name, &r.Description, &r.ArgsJSON, &r.PermissionRequired, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) InsertBotAudit(id, botUserID, route, guildID string, status int) error {
	_, err := d.Exec(
		`INSERT INTO bot_audit (id, bot_user_id, route, guild_id, status) VALUES ($1, $2, $3, $4, $5)`,
		id, botUserID, route, guildID, status,
	)
	return err
}

// GetGuildCommandByName resolves a slash command in a guild.
//
// Lookup order: exact guild_id match first, then global (''). This
// lets a guild override a global command with a local one of the
// same name — matches Discord's semantics where guild commands
// take priority.
//
// Returns sql.ErrNoRows if no matching command exists.
func (d *DB) GetGuildCommandByName(guildID, name string) (*BotCommandRow, error) {
	r := &BotCommandRow{}
	err := d.QueryRow(
		`SELECT id, bot_user_id, guild_id, name, description, args_json,
		 permission_required, created_at
		 FROM bot_commands
		 WHERE name = $1 AND guild_id IN ('', $2)
		 ORDER BY (guild_id = $2) DESC
		 LIMIT 1`,
		name, guildID,
	).Scan(&r.ID, &r.BotUserID, &r.GuildID, &r.Name, &r.Description, &r.ArgsJSON,
		&r.PermissionRequired, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (d *DB) GetGuildCommandByBotAndName(botUserID, guildID, name string) (*BotCommandRow, error) {
	r := &BotCommandRow{}
	err := d.QueryRow(
		`SELECT id, bot_user_id, guild_id, name, description, args_json,
		 permission_required, created_at
		 FROM bot_commands
		 WHERE bot_user_id = $1 AND name = $2 AND guild_id IN ('', $3)
		 ORDER BY (guild_id = $3) DESC
		 LIMIT 1`,
		botUserID, name, guildID,
	).Scan(&r.ID, &r.BotUserID, &r.GuildID, &r.Name, &r.Description, &r.ArgsJSON,
		&r.PermissionRequired, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}