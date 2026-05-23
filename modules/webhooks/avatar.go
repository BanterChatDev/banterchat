package webhooks

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/avatar"
	"ror/modules/db"
	"ror/modules/fileutil"
	"ror/modules/id"
	"ror/modules/permissions"
)

type AvatarService struct {
	db        *db.DB
	avatarCfg avatar.UserConfig
	masterKey string
	audit     *auditlog.Service
}

func NewAvatarService(d *db.DB, avatarCfg avatar.UserConfig, masterKey string, audit *auditlog.Service) *AvatarService {
	fileutil.EnsureDir(avatarCfg.StoragePath + "/webhooks")
	return &AvatarService{db: d, avatarCfg: avatarCfg, masterKey: masterKey, audit: audit}
}

func (s *AvatarService) storagePath(webhookID, avatarID string) string {
	return fileutil.StoragePath(s.avatarCfg.StoragePath+"/webhooks", webhookID, avatarID)
}

func (s *AvatarService) deleteExisting(webhookID string) {
	if oldID := s.db.GetWebhookAvatarByWebhook(webhookID); oldID != "" {
		fileutil.Remove(s.storagePath(webhookID, oldID))
		s.db.DeleteWebhookAvatarsByWebhook(webhookID)
	}
}

func (s *AvatarService) DeleteByWebhook(webhookID string) {
	s.deleteExisting(webhookID)
}

func (s *AvatarService) GetByWebhookID(webhookID string) string {
	return s.db.GetWebhookAvatarByWebhook(webhookID)
}

func (s *AvatarService) Upload(c echo.Context) error {
	actorID := c.Get("userID").(string)
	wid := c.Param("id")
	var guildID, channelID string
	err := s.db.QueryRow(`SELECT guild_id, channel_id FROM webhooks WHERE id = $1`, wid).Scan(&guildID, &channelID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "webhook not found"})
	}
	perms := permissions.ResolveChannelPerms(s.db, actorID, channelID)
	if !permissions.HasPerm(perms, permissions.PermManageWebhooks) {
		return c.JSON(403, echo.Map{"error": "manage_webhooks required"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(400, echo.Map{"error": avatar.ErrNoFile.Error()})
	}
	processed, err := avatar.Process(file, s.avatarCfg.MaxSize, s.avatarCfg.MaxPixels, s.masterKey)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	avatarID := id.Generate()
	s.deleteExisting(wid)

	storagePath := s.storagePath(wid, avatarID)
	if err := avatar.WriteToStorage(processed, s.masterKey, storagePath); err != nil {
		return c.JSON(500, echo.Map{"error": avatar.ErrServerError.Error()})
	}
	if err := s.db.InsertWebhookAvatar(avatarID, wid, processed.EncMIME, processed.Size); err != nil {
		fileutil.Remove(storagePath)
		return c.JSON(500, echo.Map{"error": avatar.ErrServerError.Error()})
	}
	s.db.Exec(`UPDATE webhooks SET avatar_id = $1 WHERE id = $2`, avatarID, wid)

	if s.audit != nil {
		s.audit.RecordGuild(actorID, guildID, auditlog.TargetWebhook, wid, auditlog.ActionWebhookUpdate, "",
			map[string]any{"action": "avatar_upload"})
	}
	return c.JSON(200, echo.Map{"avatar_id": avatarID})
}

func (s *AvatarService) Delete(c echo.Context) error {
	actorID := c.Get("userID").(string)
	wid := c.Param("id")
	var guildID, channelID string
	err := s.db.QueryRow(`SELECT guild_id, channel_id FROM webhooks WHERE id = $1`, wid).Scan(&guildID, &channelID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "webhook not found"})
	}
	perms := permissions.ResolveChannelPerms(s.db, actorID, channelID)
	if !permissions.HasPerm(perms, permissions.PermManageWebhooks) {
		return c.JSON(403, echo.Map{"error": "manage_webhooks required"})
	}
	s.deleteExisting(wid)
	s.db.Exec(`UPDATE webhooks SET avatar_id = '' WHERE id = $1`, wid)
	if s.audit != nil {
		s.audit.RecordGuild(actorID, guildID, auditlog.TargetWebhook, wid, auditlog.ActionWebhookUpdate, "",
			map[string]any{"action": "avatar_delete"})
	}
	return c.JSON(200, echo.Map{"avatar_id": ""})
}

func (s *AvatarService) Serve(c echo.Context) error {
	avatarID := c.Param("id")
	if avatarID == "" || strings.ContainsAny(avatarID, "/\\..") {
		return c.JSON(400, echo.Map{"error": "invalid id"})
	}
	webhookID, encMime, err := s.db.GetWebhookAvatarMeta(avatarID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": avatar.ErrNotFound.Error()})
	}
	data, err := fileutil.ReadAndDecrypt(s.storagePath(webhookID, avatarID), s.masterKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": avatar.ErrNotFound.Error()})
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.Blob(200, avatar.DecryptMIME(encMime, s.masterKey), data)
}