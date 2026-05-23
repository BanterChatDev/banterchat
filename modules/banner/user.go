package banner

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/avatar"
	"ror/modules/fileutil"
	"ror/modules/id"
	"ror/modules/logger"
)

func (s *Service) Upload(c echo.Context) error {
	return s.UploadFor(c, c.Get("userID").(string))
}

// UploadFor uploads a banner for an explicit user ID. See
// avatar.Service.UploadFor for the rationale (bot endpoints upload
// to the bot user's ID, not the owner's).
func (s *Service) UploadFor(c echo.Context, userID string) error {
	file, err := c.FormFile("file")
	if err != nil {
		logger.Error("banner upload: form file error", "error", err, "user", userID)
		return c.JSON(400, echo.Map{"error": avatar.ErrNoFile.Error()})
	}
	processed, err := avatar.Process(file, s.cfg.User.MaxSize, s.cfg.User.MaxPixels, s.masterKey)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	crop := c.FormValue("crop")
	bannerID := id.Generate()
	s.deleteExisting(userID)

	storagePath := fileutil.StoragePath(s.cfg.User.StoragePath, userID, bannerID)
	if err := avatar.WriteToStorage(processed, s.masterKey, storagePath); err != nil {
		return c.JSON(500, echo.Map{"error": avatar.ErrServerError.Error()})
	}
	if err := s.db.InsertBanner(bannerID, userID, processed.EncMIME, processed.Size, crop); err != nil {
		fileutil.Remove(storagePath)
		return c.JSON(500, echo.Map{"error": avatar.ErrServerError.Error()})
	}
	if s.UpdateUserBanner != nil {
		s.UpdateUserBanner(userID, bannerID)
	}
	s.emitUserUpdate(userID, map[string]string{"id": userID, "banner_id": bannerID, "banner_crop": crop})
	return c.JSON(200, echo.Map{"banner_id": bannerID, "banner_crop": crop})
}

func (s *Service) Delete(c echo.Context) error {
	return s.DeleteFor(c, c.Get("userID").(string))
}

// DeleteFor — see UploadFor.
func (s *Service) DeleteFor(c echo.Context, userID string) error {
	s.deleteExisting(userID)
	if s.UpdateUserBanner != nil {
		s.UpdateUserBanner(userID, "")
	}
	s.emitUserUpdate(userID, map[string]string{"id": userID, "banner_id": "", "banner_crop": ""})
	return c.JSON(200, echo.Map{"banner_id": "", "banner_crop": ""})
}

func (s *Service) Serve(c echo.Context) error {
	bannerID := c.Param("id")
	if bannerID == "" || strings.ContainsAny(bannerID, "/\\..") {
		return c.JSON(400, echo.Map{"error": "invalid id"})
	}
	userID, encMime, err := s.db.GetBannerMeta(bannerID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "banner not found"})
	}
	data, err := fileutil.ReadAndDecrypt(fileutil.StoragePath(s.cfg.User.StoragePath, userID, bannerID), s.masterKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "banner not found"})
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.Blob(200, avatar.DecryptMIME(encMime, s.masterKey), data)
}

func (s *Service) deleteExisting(userID string) {
	if oldID := s.db.GetBannerByUser(userID); oldID != "" {
		fileutil.Remove(fileutil.StoragePath(s.cfg.User.StoragePath, userID, oldID))
		s.db.DeleteBannersByUser(userID)
	}
}