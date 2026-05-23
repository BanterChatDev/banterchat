package users

import (
	"sort"
	"strings"
	"sync"
	"time"

	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/id"
)

// User is an alias for db.UserRow to eliminate duplication
type User = db.UserRow

type UserRole struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	Permissions int64  `json:"permissions"`
	Deny        int64  `json:"deny"`
	Position    int    `json:"position"`
}

type UserWithRoles struct {
	User
}

func (s *Service) CreateUser(username, usernameHash, passwordHash, encryptedKey, ip string) (*User, error) {
	id := id.Generate()
	if err := s.db.InsertUser(id, username, usernameHash, passwordHash, encryptedKey, ip); err != nil {
		return nil, err
	}
	return &User{
		ID: id, Username: username, UsernameHash: usernameHash, PasswordHash: passwordHash,
		EncryptedKey: encryptedKey, LastLoginIP: ip,
		CreatedAt: time.Now(),
	}, nil
}

func (s *Service) CreateBotUser(botUserID, encBotName, botNameHash, discriminator, encryptedKey string) error {
	return s.db.InsertBotUser(botUserID, encBotName, botNameHash, discriminator, encryptedKey)
}

func (s *Service) NextBotDiscriminator(botNameHash string) (string, error) {
	return s.db.NextBotDiscriminator(botNameHash)
}

func (s *Service) GetUserByUsername(usernameHash string) (*User, error) {
	return s.db.GetUserByUsernameHash(usernameHash)
}

type userCacheEntry struct {
	user    *User
	expires time.Time
}

var (
	userCache sync.Map
	userTTL   = 60 * time.Second
)

func (s *Service) GetUserByID(id string) (*User, error) {
	now := time.Now()
	if cached, ok := userCache.Load(id); ok {
		if e, ok := cached.(userCacheEntry); ok && now.Before(e.expires) {
			return e.user, nil
		}
	}
	u, err := s.db.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	userCache.Store(id, userCacheEntry{user: u, expires: now.Add(userTTL)})
	return u, nil
}

func InvalidateUserCache(userID string) {
	userCache.Delete(userID)
}

type DecryptedUserMini struct {
	ID          string
	Username    string
	DisplayName string
	IsBot       bool
	Flair       string
}

func (s *Service) decryptMini(m db.UserMini) DecryptedUserMini {
	d := DecryptedUserMini{ID: m.ID, IsBot: m.IsBot, Flair: m.Flair}
	source := m.Username
	if m.IsBot && m.BotUsername != "" {
		source = m.BotUsername
	}
	if m.EncryptedKey == "" {
		d.Username = source
		d.DisplayName = m.DisplayName
		return d
	}
	userKey, err := encryption.DecryptUserKey(m.EncryptedKey, s.masterKey)
	if err != nil {
		d.Username = source
		d.DisplayName = m.DisplayName
		return d
	}
	if plain, err := encryption.Decrypt(source, userKey); err == nil {
		d.Username = plain
	} else {
		d.Username = source
	}
	if m.DisplayName != "" {
		if plain, err := encryption.Decrypt(m.DisplayName, userKey); err == nil {
			d.DisplayName = plain
		} else {
			d.DisplayName = m.DisplayName
		}
	}
	return d
}

func (s *Service) DecryptUserMinisByIDs(ids []string) map[string]DecryptedUserMini {
	raw, err := s.db.GetUserMinisByIDs(ids)
	if err != nil || len(raw) == 0 {
		return nil
	}
	out := make(map[string]DecryptedUserMini, len(raw))
	for uid, m := range raw {
		out[uid] = s.decryptMini(m)
	}
	return out
}

func (s *Service) UpdateLastLoginIP(userID, ipHash string) {
	s.db.UpdateUserIP(userID, ipHash)
}

func (s *Service) UpdateBio(userID, bio string) error {
	err := s.db.UpdateUserBio(userID, bio)
	if err == nil {
		InvalidateUserCache(userID)
	}
	return err
}

func (s *Service) UpdateUsername(userID, encUsername, usernameHash string) error {
	err := s.db.UpdateUserUsername(userID, encUsername, usernameHash)
	if err == nil {
		InvalidateUserCache(userID)
	}
	return err
}

func (s *Service) UpdateAvatar(userID, avatarID string) error {
	err := s.db.UpdateUserAvatar(userID, avatarID)
	if err == nil {
		InvalidateUserCache(userID)
	}
	return err
}

func (s *Service) PreloadRoles() map[string]UserRole {
	m := make(map[string]UserRole)
	minis, err := s.db.ListRoleMinis()
	if err != nil {
		return m
	}
	for _, r := range minis {
		m[r.ID] = UserRole{ID: r.ID, Name: encryption.DecryptField(r.Name, s.masterKey), Color: r.Color, Permissions: r.Permissions, Deny: r.Deny, Position: r.Position}
	}
	return m
}

func ResolveRolesFromMap(rolesStr string, roleMap map[string]UserRole) []UserRole {
	if rolesStr == "" {
		return []UserRole{}
	}
	var roles []UserRole
	for _, id := range strings.Split(rolesStr, ",") {
		id = strings.TrimSpace(id)
		if r, ok := roleMap[id]; ok {
			roles = append(roles, r)
		}
	}
	if roles == nil {
		return []UserRole{}
	}
	sort.Slice(roles, func(i, j int) bool {
		return roles[i].Position < roles[j].Position
	})
	return roles
}

func (s *Service) ListUsers() ([]UserWithRoles, error) {
	return s.listUsersInternal(false)
}

func (s *Service) ListUsersIncludingBanned() ([]UserWithRoles, error) {
	return s.listUsersInternal(true)
}

func (s *Service) listUsersInternal(includeBanned bool) ([]UserWithRoles, error) {
	var dbRows []db.UserRow
	var err error
	if includeBanned {
		dbRows, err = s.db.ListAllUsersIncludingBanned()
	} else {
		dbRows, err = s.db.ListAllUsers()
	}
	if err != nil {
		return nil, err
	}
	usersList := make([]UserWithRoles, len(dbRows))
	for i, r := range dbRows {
		usersList[i] = UserWithRoles{User: r}
	}
	return usersList, nil
}