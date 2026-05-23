package emojis

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/db"
	"ror/modules/emojis/defaults"
	"ror/modules/encryption"
	"ror/modules/fileutil"
	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/websocket"
)

type Service struct {
	db        *db.DB
	cfg       Config
	masterKey string
	hub       *websocket.Hub

	CanManageGuild func(userID string, guildID string) bool
}

func NewService(d *db.DB, cfg Config, masterKey string, hub *websocket.Hub) *Service {
	fileutil.EnsureDir(cfg.StoragePath)
	fileutil.EnsureDir(filepath.Join(cfg.StoragePath, cfg.DefaultSubdir))
	return &Service{db: d, cfg: cfg, masterKey: masterKey, hub: hub}
}

type EmojiJSON struct {
	ID        string `json:"id"`
	GuildID   string `json:"guild_id"`
	Name      string `json:"name"`
	Animated  bool   `json:"animated"`
	URL       string `json:"url"`
	Category  string `json:"category"`
	CreatedBy string `json:"created_by"`
}

func toJSON(e *db.GuildEmojiRow) EmojiJSON {
	return EmojiJSON{
		ID:        e.ID,
		GuildID:   e.GuildID.String,
		Name:      e.Name,
		Animated:  e.Animated,
		URL:       "/api/v1/emojis/" + e.ID,
		Category:  e.Category,
		CreatedBy: e.CreatedBy.String,
	}
}

func (s *Service) authorize(c echo.Context, guildID string) (string, error) {
	userID := c.Get("userID").(string)
	if s.CanManageGuild == nil || !s.CanManageGuild(userID, guildID) {
		return "", ErrNotAllowed
	}
	return userID, nil
}

// POST /api/v1/guilds/:guildId/emojis — upload a new custom emoji
func (s *Service) Upload(c echo.Context) error {
	guildID := c.Param("guildId")
	userID, aerr := s.authorize(c, guildID)
	if aerr != nil {
		return c.JSON(403, echo.Map{"error": aerr.Error()})
	}

	name := strings.TrimSpace(c.FormValue("name"))
	if err := ValidateName(name, s.cfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if s.db.GuildEmojiNameTaken(guildID, name) {
		return c.JSON(400, echo.Map{"error": ErrNameTaken.Error()})
	}
	if s.db.CountGuildEmojis(guildID) >= s.cfg.MaxPerGuild {
		return c.JSON(400, echo.Map{"error": ErrLimitReached.Error()})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(400, echo.Map{"error": ErrNoFile.Error()})
	}
	v, verr := ValidateFile(file, s.cfg)
	if verr != nil {
		return c.JSON(400, echo.Map{"error": verr.Error()})
	}
	clean := fileutil.ClearMetadata(v.Data, v.MIME)
	storedSize := int64(len(clean))

	emojiID := id.Generate(s.cfg.IDLength)
	storagePath := fileutil.StoragePath(s.cfg.StoragePath, guildID, emojiID)
	if err := fileutil.EncryptAndWrite(clean, s.masterKey, storagePath); err != nil {
		logger.Error("emoji upload write failed", "error", err, "guild", guildID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	mimeEnc := encryption.EncryptField(v.MIME, s.masterKey)
	if err := s.db.InsertGuildEmoji(emojiID, guildID, name, mimeEnc, storedSize, v.Animated, userID); err != nil {
		fileutil.Remove(storagePath)
		logger.Error("emoji insert failed", "error", err, "guild", guildID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}

	row, _ := s.db.GetGuildEmoji(emojiID)
	out := toJSON(row)
	s.emitCreate(guildID, out)
	return c.JSON(201, out)
}

func (s *Service) ListDefaults(c echo.Context) error {
	rows, err := s.db.ListDefaultEmojis()
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	out := make([]EmojiJSON, len(rows))
	for i := range rows {
		out[i] = toJSON(&rows[i])
	}
	return c.JSON(200, out)
}

type CategoryIconJSON struct {
	Category string `json:"category"`
	EmojiID  string `json:"emoji_id"`
}

func (s *Service) ListCategoryIcons(c echo.Context) error {
	icons := defaults.CategoryIcons()
	out := make([]CategoryIconJSON, 0, len(icons))
	for _, ic := range icons {
		name := categoryIconEmojiName(ic.Category)
		if name == "" {
			continue
		}
		out = append(out, CategoryIconJSON{
			Category: ic.Category,
			EmojiID:  defaultEmojiID(name),
		})
	}
	return c.JSON(200, out)
}

func (s *Service) ListFrequent(c echo.Context) error {
	userID, _ := c.Get("userID").(string)
	if userID == "" {
		return c.JSON(200, []EmojiJSON{})
	}
	channelID := c.QueryParam("channel_id")
	var allowedGuildID string
	if channelID != "" {
		allowedGuildID = s.db.GetChannelGuildID(channelID)
	}
	ids := s.db.GetFreqEmojis(userID, freqEmojiLimit*4)
	out := make([]EmojiJSON, 0, freqEmojiLimit)
	for _, eid := range ids {
		row, err := s.db.GetGuildEmoji(eid)
		if err != nil || row == nil {
			continue
		}
		if row.GuildID.Valid {
			if channelID == "" {
				continue
			}
			if !s.db.IsEmojiAllowedInGuild(eid, allowedGuildID) {
				continue
			}
		}
		out = append(out, toJSON(row))
		if len(out) >= freqEmojiLimit {
			break
		}
	}
	return c.JSON(200, out)
}

const freqEmojiLimit = 4

func (s *Service) List(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	rows, err := s.db.ListGuildEmojis(guildID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	out := make([]EmojiJSON, len(rows))
	for i := range rows {
		out[i] = toJSON(&rows[i])
	}
	return c.JSON(200, out)
}

// DELETE /api/v1/guilds/:guildId/emojis/:emojiId — remove a custom emoji
func (s *Service) Delete(c echo.Context) error {
	guildID := c.Param("guildId")
	emojiID := c.Param("emojiId")
	if _, aerr := s.authorize(c, guildID); aerr != nil {
		return c.JSON(403, echo.Map{"error": aerr.Error()})
	}
	row, err := s.db.GetGuildEmoji(emojiID)
	if err != nil || row.GuildID.String != guildID {
		return c.JSON(404, echo.Map{"error": ErrEmojiNotFound.Error()})
	}
	if err := s.db.DeleteGuildEmoji(emojiID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	storagePath := fileutil.StoragePath(s.cfg.StoragePath, guildID, emojiID)
	fileutil.Remove(storagePath)
	s.emitDelete(guildID, emojiID)
	return c.JSON(200, echo.Map{"message": "deleted"})
}

// PATCH /api/v1/guilds/:guildId/emojis/:emojiId — rename a custom emoji
func (s *Service) Rename(c echo.Context) error {
	guildID := c.Param("guildId")
	emojiID := c.Param("emojiId")
	if _, aerr := s.authorize(c, guildID); aerr != nil {
		return c.JSON(403, echo.Map{"error": aerr.Error()})
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidName.Error()})
	}
	name := strings.TrimSpace(req.Name)
	if err := ValidateName(name, s.cfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	row, err := s.db.GetGuildEmoji(emojiID)
	if err != nil || row.GuildID.String != guildID {
		return c.JSON(404, echo.Map{"error": ErrEmojiNotFound.Error()})
	}
	if s.db.GuildEmojiNameTakenExcluding(guildID, name, emojiID) {
		return c.JSON(400, echo.Map{"error": ErrNameTaken.Error()})
	}
	if err := s.db.UpdateGuildEmojiName(emojiID, name); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	row.Name = name
	out := toJSON(row)
	s.emitUpdate(guildID, out)
	return c.JSON(200, out)
}

// GET /api/v1/emojis/:emojiId — public read endpoint, returns the image bytes
// with the original MIME type. No auth required for member-uploaded emojis
// since they're embedded in messages and need to be cacheable. The DB row
// is the access control: deleting the row pulls the file from rotation.
func (s *Service) Serve(c echo.Context) error {
	emojiID := c.Param("emojiId")
	row, err := s.db.GetGuildEmoji(emojiID)
	if err != nil {
		return c.NoContent(http.StatusNotFound)
	}
	if !row.GuildID.Valid {
		mime := row.MimeEnc
		if mime == "" {
			mime = fileutil.MimePNG
		}
		data, rerr := os.ReadFile(s.defaultPath(row.Name))
		if rerr != nil {
			return c.NoContent(http.StatusNotFound)
		}
		c.Response().Header().Set("Cache-Control", "public, max-age=86400")
		return c.Blob(http.StatusOK, mime, data)
	}
	mime := encryption.DecryptField(row.MimeEnc, s.masterKey)
	if mime == "" {
		mime = fileutil.MimePNG
	}
	storagePath := fileutil.StoragePath(s.cfg.StoragePath, row.GuildID.String, row.ID)
	data, err := fileutil.ReadAndDecrypt(storagePath, s.masterKey)
	if err != nil {
		return c.NoContent(http.StatusNotFound)
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.Blob(http.StatusOK, mime, data)
}