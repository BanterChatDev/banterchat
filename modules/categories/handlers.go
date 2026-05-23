package categories

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/conf"
	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/logger"
	"ror/modules/permissions"
	"ror/modules/websocket"
)

type Service struct {
	db    *db.DB
	hub   *websocket.Hub
	audit *auditlog.Service
}

func NewService(db *db.DB, hub *websocket.Hub, audit *auditlog.Service) *Service {
	return &Service{db: db, hub: hub, audit: audit}
}

func (s *Service) decryptCategory(c *Category) {
	c.Name = encryption.DecryptField(c.Name, (conf.Default{}).Auth().MasterKey)
}

func (s *Service) decryptCategories(cats []Category) []Category {
	for i := range cats {
		s.decryptCategory(&cats[i])
	}
	return cats
}

func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	cats, err := s.listCategoriesInGuild(guildID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, cats)
}

func (s *Service) Create(c echo.Context) error {
	var req struct {
		Name                string `json:"name"`
		PermissionOverrides []struct {
			RoleID string `json:"role_id"`
			Allow  int64  `json:"allow"`
			Deny   int64  `json:"deny"`
		} `json:"permission_overrides"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) < 1 || len(req.Name) > 30 {
		return c.JSON(400, echo.Map{"error": ErrInvalidName.Error()})
	}
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")
	cat, err := s.createCategoryInGuild(guildID, req.Name, userID, (conf.Default{}).Auth().MasterKey)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return c.JSON(409, echo.Map{"error": ErrCategoryExists.Error()})
		}
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}

	for _, p := range req.PermissionOverrides {
		if p.RoleID == "" {
			continue
		}
		if err := s.setCategoryPerm(cat.ID, p.RoleID, p.Allow, p.Deny); err != nil {
			logger.Error("categories: initial perm override failed", "error", err, "category", cat.ID, "role", p.RoleID)
		}
	}
	if len(req.PermissionOverrides) > 0 {
		permissions.InvalidateAllPermCache()
		if full, err := s.getDecryptedWithOverrides(cat.ID); err == nil {
			cat = full
		}
	} else {
		cat.PermissionOverrides = []CategoryPermission{}
	}

	s.emitCreate(guildID, cat)
	if s.audit != nil {
		s.audit.RecordGuild(userID, guildID, auditlog.TargetCategory, cat.ID, auditlog.ActionCategoryCreate, "",
			map[string]any{"name": cat.Name})
	}
	return c.JSON(201, cat)
}

func (s *Service) Update(c echo.Context) error {
	id := c.Param("id")
	existing, err := s.getCategory(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrCategoryNotFound.Error()})
	}
	var req struct {
		Name     *string `json:"name"`
		Position *int    `json:"position"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	s.decryptCategory(existing)
	name := existing.Name
	position := existing.Position
	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
		if len(name) < 1 || len(name) > 30 {
			return c.JSON(400, echo.Map{"error": ErrInvalidName.Error()})
		}
	}
	if req.Position != nil {
		position = *req.Position
	}
	if err := s.updateCategory(id, name, position, (conf.Default{}).Auth().MasterKey); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	updated, _ := s.getDecryptedWithOverrides(id)
	guildID := s.db.GetCategoryGuildID(id)
	s.emitUpdate(guildID, updated)
	if s.audit != nil {
		userID := c.Get("userID").(string)
		s.audit.RecordGuild(userID, guildID, auditlog.TargetCategory, id, auditlog.ActionCategoryUpdate, "",
			map[string]any{"name": updated.Name})
	}
	return c.JSON(200, updated)
}

func (s *Service) Reorder(c echo.Context) error {
	guildID := c.Param("guildId")
	var req struct {
		Items []struct {
			ID       string `json:"id"`
			Position int    `json:"position"`
		} `json:"items"`
	}
	if err := c.Bind(&req); err != nil || len(req.Items) == 0 {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	dbItems := make([]struct{ ID string; Position int }, len(req.Items))
	for i, item := range req.Items {
		dbItems[i] = struct{ ID string; Position int }{item.ID, item.Position}
	}
	if err := s.db.ReorderCategories(dbItems); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if cats, err := s.listCategoriesInGuild(guildID); err == nil {
		s.emitReorder(guildID, cats)
	}
	return c.JSON(200, echo.Map{"message": "ok"})
}

func (s *Service) Delete(c echo.Context) error {
	id := c.Param("id")
	existing, err := s.getCategory(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrCategoryNotFound.Error()})
	}
	userID := c.Get("userID").(string)
	guildID := s.db.GetCategoryGuildID(id)
	if err := s.deleteCategory(id); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidateAllPermCache()
	s.emitDelete(guildID, id)
	if s.audit != nil {
		s.decryptCategory(existing)
		s.audit.RecordGuild(userID, guildID, auditlog.TargetCategory, id, auditlog.ActionCategoryDelete, "",
			map[string]any{"name": existing.Name})
	}
	return c.JSON(200, echo.Map{"message": "category deleted"})
}

func (s *Service) GetPerms(c echo.Context) error {
	id := c.Param("id")
	perms, err := s.getCategoryPerms(id)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if perms == nil {
		perms = []CategoryPermission{}
	}
	return c.JSON(200, perms)
}

func (s *Service) SetPerm(c echo.Context) error {
	id := c.Param("id")
	_, err := s.getCategory(id)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrCategoryNotFound.Error()})
	}
	var req struct {
		RoleID string `json:"role_id"`
		Allow  int64  `json:"allow"`
		Deny   int64  `json:"deny"`
	}
	if err := c.Bind(&req); err != nil || req.RoleID == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if err := s.setCategoryPerm(id, req.RoleID, req.Allow, req.Deny); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidateAllPermCache()
	cat, _ := s.getDecryptedWithOverrides(id)
	guildID := s.db.GetCategoryGuildID(id)
	s.emitUpdate(guildID, cat)
	return c.JSON(200, cat)
}