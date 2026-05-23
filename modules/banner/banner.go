package banner

import (
	"ror/modules/db"
	"ror/modules/fileutil"
	"ror/modules/websocket"
)

type Service struct {
	db                *db.DB
	cfg               Config
	masterKey         string
	hub               *websocket.Hub
	UpdateUserBanner  func(userID, bannerID string) error
	CanManageGuild    func(userID string, row *db.GuildRow) bool
	EmitGuildUpdate   func(guildID string, payload map[string]interface{})
}

func NewService(db *db.DB, cfg Config, masterKey string, hub *websocket.Hub) *Service {
	fileutil.EnsureDir(cfg.User.StoragePath)
	fileutil.EnsureDir(cfg.Guild.StoragePath)
	return &Service{db: db, cfg: cfg, masterKey: masterKey, hub: hub}
}

func (s *Service) GetByUserID(userID string) string {
	return s.db.GetBannerByUser(userID)
}

func (s *Service) GetCropByUserID(userID string) string {
	return s.db.GetBannerCropByUser(userID)
}