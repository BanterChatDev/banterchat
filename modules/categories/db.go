package categories

import (
	"ror/modules/conf"
	"time"

	"ror/modules/encryption"
	"ror/modules/id"
)

type Category struct {
	ID                string               `json:"id"`
	GuildID             string               `json:"guild_id"`
	Name                string               `json:"name"`
	Position            int                  `json:"position"`
	CreatedBy           string               `json:"created_by"`
	CreatedAt           time.Time            `json:"created_at"`
	PermissionOverrides []CategoryPermission `json:"permission_overrides"`
}

type CategoryPermission struct {
	CategoryID string `json:"category_id"`
	RoleID     string `json:"role_id"`
	RoleName   string `json:"role_name,omitempty"`
	RoleColor  string `json:"role_color,omitempty"`
	Allow      int64  `json:"allow"`
	Deny       int64  `json:"deny"`
}

// listCategories (unscoped) + listAllDecrypted removed — use
// listCategoriesInGuild(guildID).

func (s *Service) getCategory(id string) (*Category, error) {
	r, err := s.db.GetCategory(id)
	if err != nil {
		return nil, err
	}
	return &Category{ID: r.ID, GuildID: r.GuildID, Name: r.Name, Position: r.Position, CreatedBy: r.CreatedBy, CreatedAt: r.CreatedAt}, nil
}

func (s *Service) createCategory(name, createdBy, masterKey string) (*Category, error) {
	cid := id.Generate()
	encName := encryption.EncryptField(name, masterKey)
	nameHash := encryption.HashIdentifier(name, masterKey)
	maxPos := s.db.MaxCategoryPosition()
	err := s.db.InsertCategory(cid, encName, nameHash, maxPos+1, createdBy)
	if err != nil {
		return nil, err
	}
	return &Category{ID: cid, Name: name, Position: maxPos + 1, CreatedBy: createdBy, CreatedAt: time.Now()}, nil
}

func (s *Service) createCategoryInGuild(guildID, name, createdBy, masterKey string) (*Category, error) {
	cid := id.Generate()
	encName := encryption.EncryptField(name, masterKey)
	nameHash := encryption.HashIdentifier(name, masterKey)
	maxPos := s.db.MaxCategoryPositionInGuild(guildID)
	err := s.db.InsertCategoryInGuild(cid, guildID, encName, nameHash, maxPos+1, createdBy)
	if err != nil {
		return nil, err
	}
	return &Category{ID: cid, GuildID: guildID, Name: name, Position: maxPos + 1, CreatedBy: createdBy, CreatedAt: time.Now()}, nil
}

func (s *Service) updateCategory(id, name string, position int, masterKey string) error {
	encName := encryption.EncryptField(name, masterKey)
	nameHash := encryption.HashIdentifier(name, masterKey)
	return s.db.UpdateCategory(id, encName, nameHash, position)
}

func (s *Service) deleteCategory(id string) error {
	return s.db.DeleteCategory(id)
}

func (s *Service) getCategoryPerms(categoryID string) ([]CategoryPermission, error) {
	dbRows, err := s.db.GetCategoryPerms(categoryID)
	if err != nil {
		return nil, err
	}
	out := make([]CategoryPermission, len(dbRows))
	for i, r := range dbRows {
		out[i] = CategoryPermission{CategoryID: r.CategoryID, RoleID: r.RoleID, RoleName: r.RoleName, RoleColor: r.RoleColor, Allow: r.Allow, Deny: r.Deny}
	}
	return out, nil
}

func (s *Service) decryptOverrideRoleNames(cats []Category) {
	for i := range cats {
		for j := range cats[i].PermissionOverrides {
			cats[i].PermissionOverrides[j].RoleName = encryption.DecryptField(cats[i].PermissionOverrides[j].RoleName, conf.MasterKey)
		}
	}
}

// listCategoriesInGuild returns only categories belonging to guildID with
// the same decrypt/override pipeline as listAllDecrypted.
func (s *Service) listCategoriesInGuild(guildID string) ([]Category, error) {
	rows, err := s.db.ListCategoriesByGuild(guildID)
	if err != nil { return nil, err }
	if rows == nil { return []Category{}, nil }
	cats := make([]Category, len(rows))
	for i, r := range rows {
		cats[i] = Category{
			ID: r.ID, GuildID: r.GuildID, Name: r.Name, Position: r.Position,
			CreatedBy: r.CreatedBy, CreatedAt: r.CreatedAt,
		}
	}
	cats = s.loadOverrides(cats)
	cats = s.decryptCategories(cats)
	s.decryptOverrideRoleNames(cats)
	return cats, nil
}

func (s *Service) getDecryptedWithOverrides(id string) (*Category, error) {
	cat, err := s.getCategory(id)
	if err != nil { return nil, err }
	s.decryptCategory(cat)
	overrides, _ := s.getCategoryPerms(id)
	if overrides == nil { overrides = []CategoryPermission{} }
	for i := range overrides {
		overrides[i].RoleName = encryption.DecryptField(overrides[i].RoleName, conf.MasterKey)
	}
	cat.PermissionOverrides = overrides
	return cat, nil
}

func (s *Service) setCategoryPerm(categoryID, roleID string, allow, deny int64) error {
	return s.db.SetCategoryPerm(categoryID, roleID, allow, deny)
}

func (s *Service) loadOverrides(cats []Category) []Category {
	for i := range cats {
		overrides, _ := s.getCategoryPerms(cats[i].ID)
		if overrides == nil {
			overrides = []CategoryPermission{}
		}
		cats[i].PermissionOverrides = overrides
	}
	return cats
}