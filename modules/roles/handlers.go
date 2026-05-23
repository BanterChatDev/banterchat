package roles

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/logger"
	"ror/modules/permissions"
	"ror/modules/websocket"
)

type Service struct {
	db        *db.DB
	hub       *websocket.Hub
	cfg       Config
	masterKey string
	audit     *auditlog.Service
}

func NewService(db *db.DB, hub *websocket.Hub, cfg Config, masterKey string, audit *auditlog.Service) *Service {
	return &Service{db: db, hub: hub, cfg: cfg, masterKey: masterKey, audit: audit}
}

func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	roles, err := s.listRolesInGuild(guildID)
	if err != nil {
		logger.Error("roles list failed", "error", err, "guild", guildID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if roles == nil {
		roles = []Role{}
	}
	return c.JSON(200, roles)
}

func (s *Service) Get(c echo.Context) error {
	id := c.Param("id")
	role, err := s.getRole(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrRoleNotFound.Error()})
	}
	return c.JSON(200, role)
}

func (s *Service) Create(c echo.Context) error {
	var req struct {
		Name        string `json:"name"`
		Color       string `json:"color"`
		Description string `json:"description"`
		Permissions int64  `json:"permissions"`
		Deny        int64  `json:"deny"`
		Position    int    `json:"position"`
		Mentionable bool   `json:"mentionable"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	// Membership + perm already enforced by RequirePerm middleware.
	// Owner bypasses hierarchy — can create at any position, including 0.
	if !s.db.IsGuildOwner(guildID, userID) {
		actorPos := s.db.ActorGuildTopPosition(guildID, userID)
		if req.Position <= actorPos {
			req.Position = actorPos + 1
		}
	}
	req.Name = strings.TrimSpace(strings.ToLower(req.Name))
	req.Color = strings.TrimSpace(req.Color)
	req.Description = strings.TrimSpace(req.Description)

	if err := ValidateRoleName(req.Name, s.cfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if err := ValidateRoleDescription(req.Description, s.cfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if req.Color == "" {
		req.Color = s.cfg.DefaultColor
	}
	if err := ValidateColor(req.Color); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	role, err := s.createRoleInGuild(guildID, req.Name, req.Color, req.Description, s.masterKey, req.Permissions, req.Deny, req.Position, req.Mentionable, "user")
	if err != nil {
		logger.Error("roles create failed", "error", err, "guild", guildID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitCreate(guildID, role)
	if s.audit != nil {
		s.audit.RecordGuild(userID, guildID, auditlog.TargetRole, role.ID, auditlog.ActionRoleCreate, "",
			map[string]any{"name": role.Name, "color": role.Color})
	}
	return c.JSON(201, role)
}

func (s *Service) Delete(c echo.Context) error {
	id := c.Param("id")
	role, err := s.getRole(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrRoleNotFound.Error()})
	}
	if id == AdminRoleID || id == DefaultRoleID {
		return c.JSON(400, echo.Map{"error": ErrCannotDeletePreset.Error()})
	}
	userID := c.Get("userID").(string)
	guildID := s.db.GetRoleGuildID(id)
	if !s.db.IsGuildOwner(guildID, userID) {
		actorPos := s.db.ActorGuildTopPosition(guildID, userID)
		if role.Position <= actorPos {
			return c.JSON(403, echo.Map{"error": ErrRoleHierarchy.Error()})
		}
	}
	if err := s.deleteRole(id); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidateAllPermCache()
	s.emitDelete(guildID, id)
	if s.audit != nil {
		s.audit.RecordGuild(userID, guildID, auditlog.TargetRole, id, auditlog.ActionRoleDelete, "",
			map[string]any{"name": role.Name})
	}
	return c.JSON(200, echo.Map{"message": "role deleted"})
}

func (s *Service) Update(c echo.Context) error {
	id := c.Param("id")
	existing, err := s.getRole(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrRoleNotFound.Error()})
	}
	userID := c.Get("userID").(string)
	guildID := s.db.GetRoleGuildID(id)
	isOwner := s.db.IsGuildOwner(guildID, userID)
	actorPos := 999
	if !isOwner {
		actorPos = s.db.ActorGuildTopPosition(guildID, userID)
		if existing.Position <= actorPos {
			return c.JSON(403, echo.Map{"error": ErrRoleHierarchy.Error()})
		}
	}

	var req struct {
		Name        *string `json:"name"`
		Color       *string `json:"color"`
		Description *string `json:"description"`
		Permissions *int64  `json:"permissions"`
		Deny        *int64  `json:"deny"`
		Position    *int    `json:"position"`
		Mentionable *bool   `json:"mentionable"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	name := existing.Name
	color := existing.Color
	description := existing.Description
	perms := existing.Permissions
	deny := existing.Deny
	position := existing.Position

	if req.Name != nil {
		name = strings.TrimSpace(strings.ToLower(*req.Name))
		if err := ValidateRoleName(name, s.cfg); err != nil {
			return c.JSON(400, echo.Map{"error": err.Error()})
		}
	}
	if req.Color != nil {
		color = strings.TrimSpace(*req.Color)
		if err := ValidateColor(color); err != nil {
			return c.JSON(400, echo.Map{"error": err.Error()})
		}
	}
	if req.Description != nil {
		description = strings.TrimSpace(*req.Description)
		if err := ValidateRoleDescription(description, s.cfg); err != nil {
			return c.JSON(400, echo.Map{"error": err.Error()})
		}
	}
	if req.Permissions != nil {
		perms = *req.Permissions
	}
	if req.Deny != nil {
		deny = *req.Deny
	}
	if req.Position != nil {
		if !isOwner && *req.Position <= actorPos {
			return c.JSON(403, echo.Map{"error": ErrRoleHierarchy.Error()})
		}
		position = *req.Position
	}
	mentionable := existing.Mentionable
	if req.Mentionable != nil {
		mentionable = *req.Mentionable
	}

	if err := s.updateRole(id, name, color, description, s.masterKey, perms, deny, position, mentionable); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}

	permissions.InvalidateAllPermCache()
	updated, _ := s.getRole(id)
	s.emitUpdate(guildID, updated)
	if s.audit != nil {
		s.audit.RecordGuild(userID, guildID, auditlog.TargetRole, id, auditlog.ActionRoleUpdate, "",
			map[string]any{"name": updated.Name})
	}
	return c.JSON(200, updated)
}