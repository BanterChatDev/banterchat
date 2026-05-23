package avatar

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/fileutil"
	"ror/modules/id"
	"ror/modules/logger"
)

func (s *Service) UploadGuild(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)

	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "guild not found"})
	}
	if s.CanManageGuild == nil || !s.CanManageGuild(userID, row) {
		return c.JSON(403, echo.Map{"error": "not allowed"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		logger.Error("guild icon upload: form file error", "error", err, "user", userID, "guild", guildID)
		return c.JSON(400, echo.Map{"error": ErrNoFile.Error()})
	}

	processed, err := Process(file, s.cfg.Guild.MaxSize, s.cfg.Guild.MaxPixels, s.masterKey)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	avatarID := id.Generate()
	s.deleteExistingGuild(guildID)

	storagePath := fileutil.StoragePath(s.cfg.Guild.StoragePath, guildID, avatarID)
	if err := WriteToStorage(processed, s.masterKey, storagePath); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if err := s.db.InsertGuildAvatar(avatarID, guildID, processed.EncMIME, processed.Size); err != nil {
		fileutil.Remove(storagePath)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if err := s.db.UpdateGuildIcon(guildID, avatarID); err != nil {
		logger.Error("guild icon: set guild.icon failed", "error", err, "guild", guildID)
	}

	s.emitGuildUpdate(guildID, map[string]interface{}{"id": guildID, "icon": avatarID})
	return c.JSON(200, echo.Map{"icon": avatarID})
}

func (s *Service) DeleteGuild(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)

	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "guild not found"})
	}
	if s.CanManageGuild == nil || !s.CanManageGuild(userID, row) {
		return c.JSON(403, echo.Map{"error": "not allowed"})
	}

	s.deleteExistingGuild(guildID)
	s.db.UpdateGuildIcon(guildID, "")

	s.emitGuildUpdate(guildID, map[string]interface{}{"id": guildID, "icon": ""})
	return c.JSON(200, echo.Map{"icon": ""})
}

func (s *Service) ServeGuild(c echo.Context) error {
	avatarID := c.Param("id")
	if avatarID == "" || strings.ContainsAny(avatarID, "/\\..") {
		return c.JSON(400, echo.Map{"error": "invalid id"})
	}
	guildID, encMime, err := s.db.GetGuildAvatarMeta(avatarID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "icon not found"})
	}
	data, err := fileutil.ReadAndDecrypt(
		fileutil.StoragePath(s.cfg.Guild.StoragePath, guildID, avatarID),
		s.masterKey,
	)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "icon not found"})
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.Blob(200, DecryptMIME(encMime, s.masterKey), data)
}

func (s *Service) deleteExistingGuild(guildID string) {
	if oldID := s.db.GetGuildAvatarByGuild(guildID); oldID != "" {
		fileutil.Remove(fileutil.StoragePath(s.cfg.Guild.StoragePath, guildID, oldID))
		s.db.DeleteGuildAvatarsByGuild(guildID)
	}
}