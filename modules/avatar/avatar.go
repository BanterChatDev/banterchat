package avatar

import (
	"bytes"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"mime/multipart"

	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/fileutil"
	"ror/modules/websocket"
)

type Service struct {
	db                *db.DB
	cfg               Config
	masterKey         string
	hub               *websocket.Hub
	UpdateUserAvatar  func(userID, avatarID string) error
	CanManageGuild    func(userID string, row *db.GuildRow) bool
	EmitGuildUpdate   func(guildID string, payload map[string]interface{})
}

func NewService(db *db.DB, cfg Config, masterKey string, hub *websocket.Hub) *Service {
	fileutil.EnsureDir(cfg.User.StoragePath)
	fileutil.EnsureDir(cfg.Guild.StoragePath)
	return &Service{db: db, cfg: cfg, masterKey: masterKey, hub: hub}
}

type Processed struct {
	Data    []byte
	MIME    string
	EncMIME string
	Size    int64
}

func Process(file *multipart.FileHeader, maxSize int64, maxPixels int, masterKey string) (*Processed, error) {
	if file.Size <= 0 {
		return nil, ErrTooLarge
	}
	mime, ok := fileutil.ValidateImageFile(file)
	if !ok {
		return nil, ErrInvalidType
	}
	src, err := file.Open()
	if err != nil {
		return nil, ErrServerError
	}
	defer src.Close()
	data, rerr := fileutil.ReadBounded(src, maxSize)
	if rerr != nil {
		if rerr == fileutil.ErrUploadTooLarge {
			return nil, ErrTooLarge
		}
		return nil, ErrServerError
	}
	imgCfg, _, derr := image.DecodeConfig(bytes.NewReader(data))
	if derr != nil {
		return nil, ErrInvalidType
	}
	if perr := fileutil.CheckImageDimensionBomb(imgCfg.Width, imgCfg.Height, maxPixels); perr != nil {
		return nil, ErrTooLarge
	}
	return &Processed{
		Data:    data,
		MIME:    mime,
		EncMIME: encryption.EncryptField(mime, masterKey),
		Size:    int64(len(data)),
	}, nil
}

func WriteToStorage(p *Processed, masterKey, storagePath string) error {
	return fileutil.EncryptAndWrite(p.Data, masterKey, storagePath)
}

func DecryptMIME(encMime, masterKey string) string {
	m := encryption.DecryptField(encMime, masterKey)
	if m == "" {
		m = fileutil.MimePNG
	}
	return m
}

func (s *Service) GetByUserID(userID string) string {
	return s.db.GetAvatarByUser(userID)
}