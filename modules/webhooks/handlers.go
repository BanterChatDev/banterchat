package webhooks

import (
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/encryption"
	"ror/modules/id"
)

func (s *Service) Create(c echo.Context) error {
	actorID := c.Get("userID").(string)
	channelID := c.Param("channelId")
	if channelID == "" {
		return c.JSON(400, echo.Map{"error": ErrChannelRequired.Error()})
	}
	if !s.canManage(actorID, channelID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	guildID := s.db.GetChannelGuildID(channelID)
	if guildID == "" {
		return c.JSON(400, echo.Map{"error": ErrChannelNoGuild.Error()})
	}

	var body struct {
		Name     string `json:"name"`
		AvatarID string `json:"avatar_id"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	name, err := s.validateWebhookName(body.Name, true)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	wid := id.Generate()
	token := generateToken()
	tokenHash := hashToken(token)
	tokenEnc := encryption.EncryptField(token, s.masterKey)

	_, err = s.db.Exec(`INSERT INTO webhooks (id, guild_id, channel_id, name, avatar_id, token_hash, token_enc, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		wid, guildID, channelID, name, body.AvatarID, tokenHash, tokenEnc, actorID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if s.audit != nil {
		s.audit.RecordGuild(actorID, guildID, auditlog.TargetWebhook, wid, auditlog.ActionWebhookCreate, "",
			map[string]any{"channel_id": channelID, "name": name})
	}
	return c.JSON(201, echo.Map{
		"id":         wid,
		"guild_id":   guildID,
		"channel_id": channelID,
		"name":       name,
		"avatar_id":  body.AvatarID,
		"token":      token,
		"url":        s.webhookURL(wid, token),
	})
}

func (s *Service) ListInChannel(c echo.Context) error {
	out, err := s.listByChannel(c.Param("channelId"))
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"webhooks": out})
}

func (s *Service) ListInGuild(c echo.Context) error {
	out, err := s.listByGuild(c.Param("guildId"))
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"webhooks": out})
}

func (s *Service) Update(c echo.Context) error {
	actorID := c.Get("userID").(string)
	wid := c.Param("id")
	guildID, channelID, ok := s.getWebhookGuildChannel(wid)
	if !ok {
		return c.JSON(404, echo.Map{"error": ErrWebhookNotFound.Error()})
	}
	if !s.canManage(actorID, channelID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}

	var body struct {
		Name     *string `json:"name"`
		AvatarID *string `json:"avatar_id"`
		Disabled *bool   `json:"disabled"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if body.Name != nil {
		n, err := s.validateWebhookName(*body.Name, false)
		if err != nil {
			return c.JSON(400, echo.Map{"error": err.Error()})
		}
		s.db.Exec(`UPDATE webhooks SET name = $1 WHERE id = $2`, n, wid)
	}
	if body.AvatarID != nil {
		s.db.Exec(`UPDATE webhooks SET avatar_id = $1 WHERE id = $2`, *body.AvatarID, wid)
	}
	if body.Disabled != nil {
		s.db.Exec(`UPDATE webhooks SET disabled = $1 WHERE id = $2`, *body.Disabled, wid)
	}
	if s.audit != nil {
		s.audit.RecordGuild(actorID, guildID, auditlog.TargetWebhook, wid, auditlog.ActionWebhookUpdate, "", nil)
	}
	return c.JSON(200, echo.Map{"updated": true})
}

func (s *Service) Delete(c echo.Context) error {
	actorID := c.Get("userID").(string)
	wid := c.Param("id")
	guildID, channelID, ok := s.getWebhookGuildChannel(wid)
	if !ok {
		return c.JSON(404, echo.Map{"error": ErrWebhookNotFound.Error()})
	}
	if !s.canManage(actorID, channelID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	if _, err := s.db.Exec(`DELETE FROM webhooks WHERE id = $1`, wid); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if s.audit != nil {
		s.audit.RecordGuild(actorID, guildID, auditlog.TargetWebhook, wid, auditlog.ActionWebhookDelete, "", nil)
	}
	return c.JSON(200, echo.Map{"deleted": true})
}

func (s *Service) RegenerateToken(c echo.Context) error {
	actorID := c.Get("userID").(string)
	wid := c.Param("id")
	_, channelID, ok := s.getWebhookGuildChannel(wid)
	if !ok {
		return c.JSON(404, echo.Map{"error": ErrWebhookNotFound.Error()})
	}
	if !s.canManage(actorID, channelID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	token := generateToken()
	tokenHash := hashToken(token)
	tokenEnc := encryption.EncryptField(token, s.masterKey)
	if _, err := s.db.Exec(`UPDATE webhooks SET token_hash = $1, token_enc = $2 WHERE id = $3`, tokenHash, tokenEnc, wid); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{
		"token": token,
		"url":   s.webhookURL(wid, token),
	})
}

// Get returns webhook metadata by ID + token. No auth required — possession
// of a valid URL is the credential. Used by clients to verify a webhook is
// still alive (browsing the URL, curl probing, etc.)
func (s *Service) Get(c echo.Context) error {
	wid := c.Param("id")
	token := c.Param("token")
	var w Webhook
	var lastUsed *time.Time
	var storedHash string
	err := s.db.QueryRow(`SELECT id, guild_id, channel_id, name, avatar_id, created_by, created_at, last_used_at, use_count, disabled, token_hash
		FROM webhooks WHERE id = $1`, wid).
		Scan(&w.ID, &w.GuildID, &w.ChannelID, &w.Name, &w.AvatarID, &w.CreatedBy, &w.CreatedAt, &lastUsed, &w.UseCount, &w.Disabled, &storedHash)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrWebhookNotFound.Error()})
	}
	if hashToken(token) != storedHash {
		return c.JSON(401, echo.Map{"error": ErrNotAllowed.Error()})
	}
	w.LastUsedAt = lastUsed
	w.URL = s.webhookURL(wid, token)
	return c.JSONPretty(200, w, "  ")
}

func (s *Service) Execute(c echo.Context) error {
	wid := c.Param("id")
	token := c.Param("token")
	r, ok := s.getWebhookForExecute(wid)
	if !ok {
		return c.JSON(404, echo.Map{"error": ErrWebhookNotFound.Error()})
	}
	if r.Disabled {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	if hashToken(token) != r.StoredHash {
		return c.JSON(401, echo.Map{"error": ErrNotAllowed.Error()})
	}

	body, attachmentIDs, err := s.parseExecuteRequest(c, r.ChannelID, r.CreatedBy)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if err := s.validateExecuteBody(body, len(attachmentIDs)); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	displayName := strings.TrimSpace(body.Username)
	if displayName == "" {
		displayName = r.Name
	}
	displayAvatar := body.AvatarID
	if displayAvatar == "" {
		displayAvatar = r.AvatarID
	}
	displayAvatarURL := strings.TrimSpace(body.AvatarURL)

	if s.OnSendMessage == nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	msgID, err := s.OnSendMessage(r.ChannelID, r.HookID, displayName, displayAvatar, displayAvatarURL, body.Content, body.Embeds, body.TTS, attachmentIDs)
	if err != nil {
		return c.JSON(500, echo.Map{"error": err.Error()})
	}

	s.db.Exec(`UPDATE webhooks SET use_count = use_count + 1, last_used_at = NOW() WHERE id = $1`, wid)
	return c.JSON(201, echo.Map{"id": msgID})
}