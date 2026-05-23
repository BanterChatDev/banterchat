package bots

import (
	"github.com/labstack/echo/v4"
	"ror/modules/auth"
	"ror/modules/db"
	"ror/modules/websocket"
)

type UsersSvc interface {
	DecryptUsernameByID(userID string) string
	DecryptDisplayName(u *db.UserRow) string
	DecryptBio(u *db.UserRow) string
	CreateBotUser(botUserID, encBotName, botNameHash, discriminator, encryptedKey string) error
	NextBotDiscriminator(botNameHash string) (string, error)
	BuildUserResponse(viewerID, userID string) (echo.Map, error)
	GetUserByID(id string) (*db.UserRow, error)
}

type ProfilePatch struct {
	DisplayName *string
	Bio         *string
}

type Service struct {
	db        *db.DB
	cfg       Config
	authCfg   auth.Config
	masterKey string
	blacklist []string
	users     UsersSvc
	hub       *websocket.Hub

	GetAvatarID func(userID string) string
	GetBannerID func(userID string) string

	ApplyUserProfile func(targetUserID string, patch ProfilePatch) (map[string]interface{}, int, error)
}

func NewService(database *db.DB, cfg Config, authCfg auth.Config, masterKey string, blacklist []string, users UsersSvc, hub *websocket.Hub) *Service {
	return &Service{
		db:        database,
		cfg:       cfg,
		authCfg:   authCfg,
		masterKey: masterKey,
		blacklist: blacklist,
		users:     users,
		hub:       hub,
	}
}

func (s *Service) DB() *db.DB { return s.db }