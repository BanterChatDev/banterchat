package avatar

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/fileutil"
	"ror/modules/id"
	"ror/modules/logger"
)

func (s *Service) Upload(c echo.Context) error {
	return s.UploadFor(c, c.Get("userID").(string))
}

// UploadFor uploads an avatar for an explicit user ID, not the one
// from auth context. Used by the bot endpoints where the auth context
// is the owner but the avatar belongs to the bot user (a different ID).
// Upload(c) is a thin shim around this for the normal-user route.
func (s *Service) UploadFor(c echo.Context, userID string) error {
	file, err := c.FormFile("file")
	if err != nil {
		logger.Error("avatar upload: form file error", "error", err, "user", userID,
			"content_type", c.Request().Header.Get("Content-Type"),
			"content_length", c.Request().ContentLength)
		return c.JSON(400, echo.Map{"error": ErrNoFile.Error()})
	}
	processed, err := Process(file, s.cfg.User.MaxSize, s.cfg.User.MaxPixels, s.masterKey)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	avatarID := id.Generate()
	s.deleteExisting(userID)

	storagePath := fileutil.StoragePath(s.cfg.User.StoragePath, userID, avatarID)
	if err := WriteToStorage(processed, s.masterKey, storagePath); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if err := s.db.InsertAvatar(avatarID, userID, processed.EncMIME, processed.Size); err != nil {
		fileutil.Remove(storagePath)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if s.UpdateUserAvatar != nil {
		s.UpdateUserAvatar(userID, avatarID)
	}
	s.emitUserUpdate(userID, map[string]string{"id": userID, "avatar_id": avatarID})
	return c.JSON(200, echo.Map{"avatar_id": avatarID})
}

func (s *Service) Delete(c echo.Context) error {
	return s.DeleteFor(c, c.Get("userID").(string))
}

// DeleteFor — see UploadFor. Same parameterization for delete.
func (s *Service) DeleteFor(c echo.Context, userID string) error {
	s.deleteExisting(userID)
	if s.UpdateUserAvatar != nil {
		s.UpdateUserAvatar(userID, "")
	}
	s.emitUserUpdate(userID, map[string]string{"id": userID, "avatar_id": ""})
	return c.JSON(200, echo.Map{"avatar_id": ""})
}

func (s *Service) Serve(c echo.Context) error {
	avatarID := c.Param("id")
	if avatarID == "" || strings.ContainsAny(avatarID, "/\\..") {
		return c.JSON(400, echo.Map{"error": "invalid id"})
	}
	userID, encMime, err := s.db.GetAvatarMeta(avatarID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	data, err := fileutil.ReadAndDecrypt(fileutil.StoragePath(s.cfg.User.StoragePath, userID, avatarID), s.masterKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.Blob(200, DecryptMIME(encMime, s.masterKey), data)
}

func (s *Service) deleteExisting(userID string) {
	if oldID := s.db.GetAvatarByUser(userID); oldID != "" {
		fileutil.Remove(fileutil.StoragePath(s.cfg.User.StoragePath, userID, oldID))
		s.db.DeleteAvatarsByUser(userID)
	}
}