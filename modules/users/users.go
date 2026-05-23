package users

import (
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/prefs/uiprefs"
	"ror/modules/presence"
	"ror/modules/websocket"
)

const dateFormat = "2006-01-02"

func (s *Service) applyBanMask(viewerID, targetID string, payload echo.Map) {
	if viewerID == targetID {
		return
	}
	if s.IsSiteAdmin(viewerID) {
		return
	}
	if s.IsBanned == nil || !s.IsBanned(targetID) {
		return
	}
	payload["username"] = DeletedUserName
	payload["discriminator"] = DeletedUserTag
	payload["display_name"] = ""
	payload["bio"] = ""
	payload["avatar_id"] = ""
	payload["banner_id"] = ""
	payload["banner_crop"] = ""
	payload["flair"] = ""
}

type Service struct {
	db          *db.DB
	cfg         Config
	masterKey   string
	siteAdmins  []string
	blacklist   []string
	minUsername int
	maxUsername int
	hub         *websocket.Hub
	prefs       *uiprefs.Service
	IsBanned    func(userID string) bool
	GetAvatarID func(userID string) string
	GetBannerID   func(userID string) string
	GetBannerCrop func(userID string) string
	DeleteAttachment func(attID string)
}

func (s *Service) SetPrefs(p *uiprefs.Service) {
	s.prefs = p
}

func NewService(db *db.DB, cfg Config, masterKey string, siteAdmins, blacklist []string, minUsername, maxUsername int, hub *websocket.Hub) *Service {
	return &Service{
		db:          db,
		cfg:         cfg,
		masterKey:   masterKey,
		siteAdmins:  siteAdmins,
		blacklist:   blacklist,
		minUsername: minUsername,
		maxUsername: maxUsername,
		hub:         hub,
	}
}

type DecryptedFields struct {
	Username    string
	DisplayName string
	Bio         string
}

func (s *Service) decryptOneField(encryptedField, encryptedKey string) string {
	if encryptedField == "" || encryptedKey == "" {
		return encryptedField
	}
	userKey, err := encryption.DecryptUserKey(encryptedKey, s.masterKey)
	if err != nil {
		return encryptedField
	}
	plain, err := encryption.Decrypt(encryptedField, userKey)
	if err != nil {
		return encryptedField
	}
	return plain
}

func (s *Service) decryptFields(u *User) DecryptedFields {
	source := u.Username
	if u.IsBot && u.BotUsername != "" {
		source = u.BotUsername
	}
	return DecryptedFields{
		Username:    s.decryptOneField(source, u.EncryptedKey),
		DisplayName: s.decryptOneField(u.DisplayName, u.EncryptedKey),
		Bio:         s.decryptOneField(u.Bio, u.EncryptedKey),
	}
}

func (s *Service) DecryptUsername(u *User) string {
	src := u.Username
	if u.IsBot && u.BotUsername != "" {
		src = u.BotUsername
	}
	return s.decryptOneField(src, u.EncryptedKey)
}

func (s *Service) DecryptDisplayName(u *User) string {
	return s.decryptOneField(u.DisplayName, u.EncryptedKey)
}

func (s *Service) DecryptBio(u *User) string {
	return s.decryptOneField(u.Bio, u.EncryptedKey)
}

func (s *Service) avatarFor(userID string) string {
	if s.GetAvatarID != nil {
		return s.GetAvatarID(userID)
	}
	return ""
}

func (s *Service) bannerFor(userID string) string {
	if s.GetBannerID != nil {
		return s.GetBannerID(userID)
	}
	return ""
}

func (s *Service) bannerCropFor(userID string) string {
	if s.GetBannerCrop != nil {
		return s.GetBannerCrop(userID)
	}
	return ""
}

func (s *Service) GetUserKey(u *User) string {
	if u.EncryptedKey == "" {
		return ""
	}
	key, _ := encryption.DecryptUserKey(u.EncryptedKey, s.masterKey)
	return key
}

func (s *Service) IsUsernameReserved(usernameHash string) bool {
	return s.db.IsUsernameHashReserved(usernameHash)
}

func (s *Service) DecryptDisplayNameByID(userID string) string {
	if s.IsBanned != nil && s.IsBanned(userID) {
		return ""
	}
	u, err := s.GetUserByID(userID)
	if err != nil {
		return ""
	}
	return s.DecryptDisplayName(u)
}

func (s *Service) DecryptDisplayNameByIDRaw(userID string) string {
	u, err := s.GetUserByID(userID)
	if err != nil {
		return ""
	}
	return s.DecryptDisplayName(u)
}

// VerifyPassword returns true if plaintext matches the stored bcrypt hash for
// userID. Returns false on any error (user-not-found, bcrypt mismatch, etc.)
// — callers should treat false as "auth failed" without distinguishing why.
func (s *Service) VerifyPassword(userID, plaintext string) bool {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(plaintext)) == nil
}

func (s *Service) DecryptUsernameByID(userID string) string {
	if s.IsBanned != nil && s.IsBanned(userID) {
		return DeletedUserName
	}
	u, err := s.GetUserByID(userID)
	if err != nil {
		return ""
	}
	return s.DecryptUsername(u)
}

func (s *Service) DecryptUsernameByIDRaw(userID string) string {
	u, err := s.GetUserByID(userID)
	if err != nil {
		return ""
	}
	return s.DecryptUsername(u)
}

func (s *Service) DecryptIdentity(userID string) (username, displayName string) {
	u, err := s.GetUserByID(userID)
	if err != nil {
		return "", ""
	}
	return s.DecryptUsername(u), s.DecryptDisplayName(u)
}

func (s *Service) IsSiteAdmin(userID string) bool {
	if userID == "" {
		return false
	}
	for _, id := range s.siteAdmins {
		if id == userID {
			return true
		}
	}
	return s.db.IsDBSiteAdmin(userID)
}

func (s *Service) IsConfigSiteAdmin(userID string) bool {
	if userID == "" {
		return false
	}
	for _, id := range s.siteAdmins {
		if id == userID {
			return true
		}
	}
	return false
}

func (s *Service) ConfigSiteAdminIDs() []string {
	out := make([]string, 0, len(s.siteAdmins))
	out = append(out, s.siteAdmins...)
	return out
}

func (s *Service) BuildUserResponse(viewerID, userID string) (echo.Map, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	banned := s.IsBanned != nil && s.IsBanned(user.ID)
	avatarID := s.avatarFor(user.ID)
	bannerID := s.bannerFor(user.ID)
	bannerCrop := s.bannerCropFor(user.ID)
	tid := s.prefs.GetThemeID(user.ID)
	langID := s.prefs.GetLangID(user.ID)
	flairID := s.db.GetUserFlair(user.ID)
	online := s.hub.IsOnline(user.ID)
	resp := echo.Map{
		"id":              user.ID,
		"username":        s.DecryptUsername(user),
		"discriminator":   "",
		"display_name":    s.DecryptDisplayName(user),
		"bio":             s.DecryptBio(user),
		"avatar_id":       avatarID,
		"banner_id":       bannerID,
		"banner_crop":     bannerCrop,
		"flair":           flairID,
		"created_at":      user.CreatedAt.Format(dateFormat),
		"online":          online,
		"presence_status": presence.ResolveStatus(s.db, user.ID, online),
		"banned":          banned,
		"is_bot":          user.IsBot,
		"is_site_admin":   s.IsSiteAdmin(user.ID),
		"theme_id":        tid,
		"lang_id":         langID,
	}
	s.applyBanMask(viewerID, user.ID, resp)
	return resp, nil
}