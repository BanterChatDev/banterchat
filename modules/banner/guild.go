package banner

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/avatar"
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
		logger.Error("guild banner upload: form file error", "error", err, "user", userID, "guild", guildID)
		return c.JSON(400, echo.Map{"error": avatar.ErrNoFile.Error()})
	}

	processed, err := avatar.Process(file, s.cfg.Guild.MaxSize, s.cfg.Guild.MaxPixels, s.masterKey)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	crop := c.FormValue("crop")
	bannerID := id.Generate()
	s.deleteExistingGuild(guildID)

	storagePath := fileutil.StoragePath(s.cfg.Guild.StoragePath, guildID, bannerID)
	if err := avatar.WriteToStorage(processed, s.masterKey, storagePath); err != nil {
		return c.JSON(500, echo.Map{"error": avatar.ErrServerError.Error()})
	}
	if err := s.db.InsertGuildBanner(bannerID, guildID, processed.EncMIME, processed.Size, crop); err != nil {
		fileutil.Remove(storagePath)
		return c.JSON(500, echo.Map{"error": avatar.ErrServerError.Error()})
	}
	if err := s.db.UpdateGuildBanner(guildID, bannerID, crop); err != nil {
		logger.Error("guild banner: set guild.banner failed", "error", err, "guild", guildID)
	}

	s.emitGuildUpdate(guildID, map[string]interface{}{"id": guildID, "banner": bannerID, "banner_crop": crop})
	return c.JSON(200, echo.Map{"banner": bannerID, "banner_crop": crop})
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
	s.db.UpdateGuildBanner(guildID, "", "")

	s.emitGuildUpdate(guildID, map[string]interface{}{"id": guildID, "banner": "", "banner_crop": ""})
	return c.JSON(200, echo.Map{"banner": "", "banner_crop": ""})
}

func (s *Service) ServeGuild(c echo.Context) error {
	bannerID := c.Param("id")
	if bannerID == "" || strings.ContainsAny(bannerID, "/\\..") {
		return c.JSON(400, echo.Map{"error": "invalid id"})
	}
	guildID, encMime, _, err := s.db.GetGuildBannerMeta(bannerID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "banner not found"})
	}
	data, err := fileutil.ReadAndDecrypt(
		fileutil.StoragePath(s.cfg.Guild.StoragePath, guildID, bannerID),
		s.masterKey,
	)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "banner not found"})
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.Blob(200, avatar.DecryptMIME(encMime, s.masterKey), data)
}

func (s *Service) deleteExistingGuild(guildID string) {
	if oldID := s.db.GetGuildBannerByGuild(guildID); oldID != "" {
		fileutil.Remove(fileutil.StoragePath(s.cfg.Guild.StoragePath, guildID, oldID))
		s.db.DeleteGuildBannersByGuild(guildID)
	}
}