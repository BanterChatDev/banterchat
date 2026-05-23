package channels

import (
	"ror/modules/db"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/encryption"
	"ror/modules/logger"
	"ror/modules/permissions"
	"ror/modules/websocket"
)

func (s *Service) decryptChannel(ch *Channel) {
	ch.Name = encryption.DecryptField(ch.Name, s.masterKey)
	ch.Description = encryption.DecryptField(ch.Description, s.masterKey)
}

func (s *Service) decryptChannels(channels []Channel) []Channel {
	for i := range channels {
		s.decryptChannel(&channels[i])
	}
	return channels
}

type Service struct {
	db                       *db.DB
	hub                      *websocket.Hub
	cfg                      Config
	masterKey                string
	audit                    *auditlog.Service
	slowmode                 *SlowmodeTracker
	DeleteChannelAttachments func(channelID string)
	DeleteChannelMessages    func(channelID string)
}

func NewService(db *db.DB, hub *websocket.Hub, cfg Config, masterKey string, audit *auditlog.Service) *Service {
	return &Service{db: db, hub: hub, cfg: cfg, masterKey: masterKey, audit: audit, slowmode: NewSlowmodeTracker()}
}

func (s *Service) Slowmode() *SlowmodeTracker {
	return s.slowmode
}

func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	channels, err := s.listChannelsInGuild(guildID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	var visible []Channel
	for _, ch := range channels {
		if permissions.HasPerm(permissions.ResolveChannelPerms(s.db, userID, ch.ID), permissions.PermViewChannels) {
			visible = append(visible, ch)
		}
	}
	if visible == nil {
		visible = []Channel{}
	}
	return c.JSON(200, visible)
}

func (s *Service) Get(c echo.Context) error {
	id := c.Param("id")
	userID := c.Get("userID").(string)
	perms := permissions.ResolveChannelPerms(s.db, userID, id)
	if !permissions.HasPerm(perms, permissions.PermViewChannels) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	ch, err := s.getDecryptedWithOverrides(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrChannelNotFound.Error()})
	}
	if ch.PermissionOverrides == nil {
		ch.PermissionOverrides = []ChannelPermission{}
	}
	return c.JSON(200, ch)
}

func (s *Service) Create(c echo.Context) error {
	var req struct {
		Name                string `json:"name"`
		Description         string `json:"description"`
		CategoryID          string `json:"category_id"`
		Type                string `json:"type"`
		PermissionOverrides []struct {
			RoleID string `json:"role_id"`
			Allow  int64  `json:"allow"`
			Deny   int64  `json:"deny"`
		} `json:"permission_overrides"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	req.Name = strings.TrimSpace(strings.ToLower(req.Name))
	req.Description = strings.TrimSpace(req.Description)
	if req.Type != "voice" {
		req.Type = "text"
	}

	if err := ValidateChannelName(req.Name, s.cfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	ch, err := s.createChannelInGuild(guildID, req.Name, req.Description, userID, req.CategoryID, s.masterKey, req.Type)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return c.JSON(409, echo.Map{"error": ErrChannelExists.Error()})
		}
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}

	for _, p := range req.PermissionOverrides {
		if p.RoleID == "" {
			continue
		}
		if err := s.setChannelPerm(ch.ID, p.RoleID, p.Allow, p.Deny); err != nil {
			logger.Error("channels: initial perm override failed", "error", err, "channel", ch.ID, "role", p.RoleID)
		}
	}
	if len(req.PermissionOverrides) > 0 {
		permissions.InvalidateAllPermCache()
		if full, err := s.getDecryptedWithOverrides(ch.ID); err == nil {
			ch = full
		}
	} else {
		ch.PermissionOverrides = []ChannelPermission{}
	}

	s.emitCreate(guildID, ch)
	return c.JSON(201, ch)
}

func (s *Service) Duplicate(c echo.Context) error {
	srcID := c.Param("id")
	src, err := s.getChannel(srcID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrChannelNotFound.Error()})
	}
	guildID := src.GuildID
	if guildID == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	s.decryptChannel(src)
	userID := c.Get("userID").(string)
	newCh, err := s.createChannelInGuild(guildID, src.Name, src.Description, userID, src.CategoryID, s.masterKey, src.Type)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	srcPerms, _ := s.getChannelPerms(srcID)
	for _, p := range srcPerms {
		if err := s.setChannelPerm(newCh.ID, p.RoleID, p.Allow, p.Deny); err != nil {
			logger.Error("channels: duplicate perm copy failed", "error", err, "channel", newCh.ID, "role", p.RoleID)
		}
	}
	if len(srcPerms) > 0 {
		permissions.InvalidateAllPermCache()
		if full, err := s.getDecryptedWithOverrides(newCh.ID); err == nil {
			newCh = full
		}
	} else {
		newCh.PermissionOverrides = []ChannelPermission{}
	}
	s.emitCreate(guildID, newCh)
	if s.audit != nil {
		s.audit.RecordGuild(userID, guildID, auditlog.TargetChannel, newCh.ID, auditlog.ActionChannelCreate, "",
			map[string]any{"name": newCh.Name, "type": newCh.Type})
	}
	return c.JSON(201, newCh)
}

func (s *Service) Delete(c echo.Context) error {
	id := c.Param("id")
	existing, err := s.getChannel(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrChannelNotFound.Error()})
	}
	userID := c.Get("userID").(string)
	guildID := s.db.GetChannelGuildID(id)
	if s.DeleteChannelAttachments != nil {
		s.DeleteChannelAttachments(id)
	}
	if s.DeleteChannelMessages != nil {	
		s.DeleteChannelMessages(id)
	}
	if err := s.deleteChannel(id); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidateAllPermCache()
	s.emitDelete(guildID, id)
	if s.audit != nil {
		s.decryptChannel(existing)
		s.audit.RecordGuild(userID, guildID, auditlog.TargetChannel, id, auditlog.ActionChannelDelete, "",
			map[string]any{"name": existing.Name})
	}
	return c.JSON(200, echo.Map{"message": "channel deleted"})
}

func (s *Service) Update(c echo.Context) error {
	id := c.Param("id")
	existing, err := s.getChannel(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrChannelNotFound.Error()})
	}

	var req struct {
		Name             *string `json:"name"`
		Description      *string `json:"description"`
		Position         *int    `json:"position"`
		CategoryID       *string `json:"category_id"`
		SlowmodeSeconds  *int    `json:"slowmode_seconds"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	s.decryptChannel(existing)
	name := existing.Name
	description := existing.Description
	position := existing.Position
	categoryID := existing.CategoryID

	if req.Name != nil {
		name = strings.TrimSpace(strings.ToLower(*req.Name))
		if err := ValidateChannelName(name, s.cfg); err != nil {
			return c.JSON(400, echo.Map{"error": err.Error()})
		}
	}
	if req.Description != nil {
		description = strings.TrimSpace(*req.Description)
	}
	if req.Position != nil {
		position = *req.Position
	}
	if req.CategoryID != nil {
		categoryID = *req.CategoryID
	}

	categoryChanged := categoryID != existing.CategoryID
	if err := s.updateChannel(id, name, description, position, categoryID, s.masterKey); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return c.JSON(409, echo.Map{"error": ErrChannelExists.Error()})
		}
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if req.SlowmodeSeconds != nil {
		v := *req.SlowmodeSeconds
		if v < 0 {
			v = 0
		}
		if v > 21600 {
			v = 21600
		}
		if v != existing.SlowmodeSeconds {
			if err := s.db.UpdateChannelSlowmode(id, v); err != nil {
				return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
			}
			s.slowmode.Reset(id)
		}
	}
	if categoryChanged {
		permissions.InvalidateAllPermCache()
	}

	updated, _ := s.getDecryptedWithOverrides(id)
	guildID := s.db.GetChannelGuildID(id)
	s.emitUpdate(guildID, updated)
	if s.audit != nil {
		userID := c.Get("userID").(string)
		s.audit.RecordGuild(userID, guildID, auditlog.TargetChannel, id, auditlog.ActionChannelUpdate, "",
			map[string]any{"name": updated.Name})
	}
	return c.JSON(200, updated)
}

func (s *Service) Reorder(c echo.Context) error {
	guildID := c.Param("guildId")
	var req struct {
		Items []struct {
			ID         string `json:"id"`
			Position   int    `json:"position"`
			CategoryID string `json:"category_id"`
		} `json:"items"`
	}
	if err := c.Bind(&req); err != nil || len(req.Items) == 0 {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	dbItems := make([]struct{ ID string; Position int; CategoryID string }, len(req.Items))
	for i, item := range req.Items {
		dbItems[i] = struct{ ID string; Position int; CategoryID string }{item.ID, item.Position, item.CategoryID}
	}
	if err := s.db.ReorderChannels(dbItems); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidateAllPermCache()
	if channels, err := s.listChannelsInGuild(guildID); err == nil {
		s.emitReorder(guildID, channels)
	}
	return c.JSON(200, echo.Map{"message": "ok"})
}

func (s *Service) GetPerms(c echo.Context) error {
	id := c.Param("id")
	userID := c.Get("userID").(string)
	userPerms := permissions.ResolveChannelPerms(s.db, userID, id)
	if !permissions.HasPerm(userPerms, permissions.PermManageChannels) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	perms, err := s.getChannelPerms(id)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if perms == nil {
		perms = []ChannelPermission{}
	}
	return c.JSON(200, perms)
}

func (s *Service) SetPerm(c echo.Context) error {
	id := c.Param("id")
	_, err := s.getChannel(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrChannelNotFound.Error()})
	}
	var req struct {
		RoleID string `json:"role_id"`
		Allow  int64  `json:"allow"`
		Deny   int64  `json:"deny"`
	}
	if err := c.Bind(&req); err != nil || req.RoleID == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if err := s.setChannelPerm(id, req.RoleID, req.Allow, req.Deny); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidateAllPermCache()
	ch, _ := s.getDecryptedWithOverrides(id)
	guildID := s.db.GetChannelGuildID(id)
	s.emitUpdate(guildID, ch)
	return c.JSON(200, ch)
}

func (s *Service) ResolvePerms(c echo.Context) error {
	channelID := c.Param("id")
	userID := c.Get("userID").(string)
	perms := permissions.ResolveChannelPerms(s.db, userID, channelID)
	return c.JSON(200, echo.Map{"permissions": perms})
}