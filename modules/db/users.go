package db

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"
)

type UserRow struct {
	ID            string
	Username      string
	UsernameHash  string
	PasswordHash  string
	EncryptedKey  string
	Bio           string
	Avatar        string
	LastLoginIP            string
	PreviousUsernameHashes string
	CreatedAt              time.Time
	IsBot                  bool
	DisplayName            string
	BotUsername            string
	BotUsernameHash        string
	BotDiscriminator       string
}

type UserMini struct {
	ID           string
	Username     string
	DisplayName  string
	EncryptedKey string
	IsBot        bool
	BotUsername  string
	Flair        string
}

func (d *DB) GetUserMinisByIDs(ids []string) (map[string]UserMini, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	seen := make(map[string]struct{}, len(ids))
	uniq := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniq = append(uniq, id)
	}
	if len(uniq) == 0 {
		return nil, nil
	}
	ph := make([]string, len(uniq))
	args := make([]interface{}, len(uniq))
	for i, id := range uniq {
		ph[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	rows, err := d.Query(`SELECT id, username, COALESCE(display_name, ''), encrypted_key, is_bot, COALESCE(bot_username, ''), COALESCE(flair, '') FROM users WHERE id IN (`+joinComma(ph)+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[string]UserMini, len(uniq))
	for rows.Next() {
		var m UserMini
		if rows.Scan(&m.ID, &m.Username, &m.DisplayName, &m.EncryptedKey, &m.IsBot, &m.BotUsername, &m.Flair) == nil {
			out[m.ID] = m
		}
	}
	return out, nil
}

func joinComma(s []string) string {
	out := ""
	for i, v := range s {
		if i > 0 {
			out += ","
		}
		out += v
	}
	return out
}

func (d *DB) UpdateUserDisplayName(userID, encDisplayName string) error {
	_, err := d.Exec(`UPDATE users SET display_name = $1 WHERE id = $2`, encDisplayName, userID)
	return err
}

func (d *DB) UpdateUserBotUsername(userID, encBotName, botNameHash, discriminator string) error {
	_, err := d.Exec(
		`UPDATE users SET bot_username = $1, bot_username_hash = $2, bot_discriminator = $3 WHERE id = $4`,
		encBotName, botNameHash, discriminator, userID,
	)
	return err
}

func (d *DB) InsertUser(id, username, usernameHash, passwordHash, encryptedKey, ip string, isBot ...bool) error {
	botFlag := false
	if len(isBot) > 0 {
		botFlag = isBot[0]
	}
	_, err := d.Exec(`INSERT INTO users (id, username, username_hash, password_hash, encrypted_key, last_login_ip, is_bot) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, username, usernameHash, passwordHash, encryptedKey, ip, botFlag)
	return err
}

var ErrDiscriminatorsExhausted = errors.New("discriminators exhausted for this name")

func (d *DB) InsertBotUser(id, encBotName, botNameHash, discriminator, encryptedKey string) error {
	_, err := d.Exec(
		`INSERT INTO users (id, username, username_hash, password_hash, encrypted_key, last_login_ip, is_bot, bot_username, bot_username_hash, bot_discriminator)
		 VALUES ($1, '', '', $2, $3, '', true, $4, $5, $6)`,
		id, "$bot$", encryptedKey, encBotName, botNameHash, discriminator,
	)
	return err
}

func (d *DB) NextBotDiscriminator(botNameHash string) (string, error) {
	if botNameHash == "" {
		return "0001", nil
	}
	rows, err := d.Query(
		`SELECT bot_discriminator FROM users
		 WHERE bot_username_hash = $1 AND bot_discriminator != ''
		 ORDER BY bot_discriminator ASC`,
		botNameHash,
	)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	taken := make(map[string]bool)
	for rows.Next() {
		var d string
		if rows.Scan(&d) == nil {
			taken[d] = true
		}
	}
	for i := 1; i <= 9999; i++ {
		candidate := fmt.Sprintf("%04d", i)
		if !taken[candidate] {
			return candidate, nil
		}
	}
	return "", ErrDiscriminatorsExhausted
}

func (d *DB) GetUserByUsernameHash(hash string) (*UserRow, error) {
	u := &UserRow{}
	err := d.QueryRow(`SELECT id, username, username_hash, password_hash, encrypted_key, bio, avatar, last_login_ip, previous_username_hashes, created_at, is_bot, COALESCE(display_name, ''), COALESCE(bot_username, ''), COALESCE(bot_username_hash, ''), COALESCE(bot_discriminator, '') FROM users WHERE username_hash = $1`, hash).
		Scan(&u.ID, &u.Username, &u.UsernameHash, &u.PasswordHash, &u.EncryptedKey, &u.Bio, &u.Avatar, &u.LastLoginIP, &u.PreviousUsernameHashes, &u.CreatedAt, &u.IsBot, &u.DisplayName, &u.BotUsername, &u.BotUsernameHash, &u.BotDiscriminator)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (d *DB) GetUserByID(id string) (*UserRow, error) {
	u := &UserRow{}
	err := d.QueryRow(`SELECT id, username, username_hash, password_hash, encrypted_key, bio, avatar, last_login_ip, previous_username_hashes, created_at, is_bot, COALESCE(display_name, ''), COALESCE(bot_username, ''), COALESCE(bot_username_hash, ''), COALESCE(bot_discriminator, '') FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.Username, &u.UsernameHash, &u.PasswordHash, &u.EncryptedKey, &u.Bio, &u.Avatar, &u.LastLoginIP, &u.PreviousUsernameHashes, &u.CreatedAt, &u.IsBot, &u.DisplayName, &u.BotUsername, &u.BotUsernameHash, &u.BotDiscriminator)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (d *DB) UpdateUserIP(userID, ip string) {
	d.Exec(`UPDATE users SET last_login_ip = $1 WHERE id = $2`, ip, userID)
}

func (d *DB) IsBot(userID string) bool {
	var isBot bool
	err := d.QueryRow(`SELECT is_bot FROM users WHERE id = $1`, userID).Scan(&isBot)
	return err == nil && isBot
}

func (d *DB) UpdateUserBio(userID, bio string) error {
	_, err := d.Exec(`UPDATE users SET bio = $1 WHERE id = $2`, bio, userID)
	return err
}

func (d *DB) UpdateUserAvatar(userID, avatarID string) error {
	_, err := d.Exec(`UPDATE users SET avatar = $1 WHERE id = $2`, avatarID, userID)
	return err
}

func (d *DB) UpdateUserUsername(userID, encUsername, usernameHash string) error {
	_, err := d.Exec(`UPDATE users SET username = $1, username_hash = $2, previous_username_hashes = CASE WHEN previous_username_hashes = '' THEN username_hash ELSE previous_username_hashes || ',' || username_hash END WHERE id = $3`, encUsername, usernameHash, userID)
	return err
}

func (d *DB) IsUsernameHashReserved(hash string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM users WHERE (',' || previous_username_hashes || ',') LIKE '%,' || $1 || ',%'`, hash).Scan(&count)
	return count > 0
}

func (d *DB) ListAllUsers() ([]UserRow, error) {
	return d.listUsers(false)
}

func (d *DB) ListAllUsersIncludingBanned() ([]UserRow, error) {
	return d.listUsers(true)
}

func (d *DB) listUsers(includeBanned bool) ([]UserRow, error) {
	query := `SELECT id, username, username_hash, password_hash, encrypted_key, bio, avatar, last_login_ip, previous_username_hashes, created_at, is_bot, COALESCE(display_name, ''), COALESCE(bot_username, ''), COALESCE(bot_username_hash, ''), COALESCE(bot_discriminator, '') FROM users`
	if !includeBanned {
		query += ` WHERE id NOT IN (SELECT user_id FROM bans)`
	}
	query += ` ORDER BY created_at ASC`
	rows, err := d.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserRow
	for rows.Next() {
		var u UserRow
		if rows.Scan(&u.ID, &u.Username, &u.UsernameHash, &u.PasswordHash, &u.EncryptedKey, &u.Bio, &u.Avatar, &u.LastLoginIP, &u.PreviousUsernameHashes, &u.CreatedAt, &u.IsBot, &u.DisplayName, &u.BotUsername, &u.BotUsernameHash, &u.BotDiscriminator) == nil {
			out = append(out, u)
		}
	}
	return out, nil
}

func (d *DB) ListUsersInGuild(guildID string, includeBanned bool) ([]UserRow, error) {
	if guildID == "" {
		return nil, nil
	}
	query := `SELECT u.id, u.username, u.username_hash, u.password_hash, u.encrypted_key, u.bio, u.avatar, u.last_login_ip, u.previous_username_hashes, u.created_at, u.is_bot, COALESCE(u.display_name, ''), COALESCE(u.bot_username, ''), COALESCE(u.bot_username_hash, ''), COALESCE(u.bot_discriminator, '') FROM users u`
	if includeBanned {
		query += ` WHERE u.id IN (SELECT user_id FROM guild_members WHERE guild_id = $1) OR u.id IN (SELECT user_id FROM guild_bans WHERE guild_id = $1)`
	} else {
		query += ` WHERE u.id IN (SELECT user_id FROM guild_members WHERE guild_id = $1) AND u.id NOT IN (SELECT user_id FROM bans)`
	}
	query += ` ORDER BY u.created_at ASC`
	rows, err := d.Query(query, guildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserRow
	for rows.Next() {
		var u UserRow
		if rows.Scan(&u.ID, &u.Username, &u.UsernameHash, &u.PasswordHash, &u.EncryptedKey, &u.Bio, &u.Avatar, &u.LastLoginIP, &u.PreviousUsernameHashes, &u.CreatedAt, &u.IsBot, &u.DisplayName, &u.BotUsername, &u.BotUsernameHash, &u.BotDiscriminator) == nil {
			out = append(out, u)
		}
	}
	return out, nil
}

func (d *DB) ListUserIDs() ([]string, error) {
	rows, err := d.Query(`SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM bans)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

func (d *DB) UserExists(userID string) bool {
	var count int
	d.QueryRow(`SELECT COUNT(*) FROM users WHERE id = $1`, userID).Scan(&count)
	return count > 0
}

func (d *DB) IsSuspendedByID(userID string) bool {
	var suspended bool
	var until *time.Time
	err := d.QueryRow(`SELECT suspended, suspended_until FROM users WHERE id = $1`, userID).Scan(&suspended, &until)
	if err != nil {
		return false
	}
	if !suspended {
		return false
	}
	if until != nil && until.Before(time.Now()) {
		d.Exec(`UPDATE users SET suspended = false, suspended_reason = '', suspended_until = NULL WHERE id = $1`, userID)
		return false
	}
	return true
}

func (d *DB) UsersWithRoleExcept(senderID, roleID string) ([]string, error) {
	rows, err := d.Query(`SELECT DISTINCT user_id FROM guild_members WHERE user_id != $1 AND (',' || roles || ',') LIKE '%,' || $2 || ',%'`, senderID, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

func (d *DB) BumpFreqEmoji(userID, emojiID string) {
	var raw string
	d.QueryRow(`SELECT freq_emojis FROM users WHERE id = $1`, userID).Scan(&raw)
	m := map[string]int{}
	if raw != "" && raw != "{}" {
		json.Unmarshal([]byte(raw), &m)
	}
	m[emojiID]++
	data, _ := json.Marshal(m)
	d.Exec(`UPDATE users SET freq_emojis = $1 WHERE id = $2`, string(data), userID)
}


func (d *DB) GetFreqEmojis(userID string, limit int) []string {
	var raw string
	d.QueryRow(`SELECT freq_emojis FROM users WHERE id = $1`, userID).Scan(&raw)
	if raw == "" || raw == "{}" {
		return nil
	}
	m := map[string]int{}
	if json.Unmarshal([]byte(raw), &m) != nil {
		return nil
	}
	type entry struct {
		e string
		c int
	}
	entries := make([]entry, 0, len(m))
	for e, c := range m {
		entries = append(entries, entry{e, c})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].c > entries[j].c })
	if limit > 0 && len(entries) > limit {
		entries = entries[:limit]
	}
	out := make([]string, len(entries))
	for i, e := range entries {
		out[i] = e.e
	}
	return out
}
