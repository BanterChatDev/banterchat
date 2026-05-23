package guilds

import (
	"fmt"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/permissions"
	"ror/modules/roles"
	"ror/modules/websocket"
)
type Guild struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Icon             string    `json:"icon"`
	Banner           string    `json:"banner"`
	BannerCrop       string    `json:"banner_crop"`
	Description      string    `json:"description"`
	OwnerID          string    `json:"owner_id"`
	WelcomeChannelID string    `json:"welcome_channel_id"`
	DefaultRoleID    string    `json:"default_role_id"`
	MemberCount      int       `json:"member_count"`
	OnlineCount      int       `json:"online_count"`
	CreatedAt        time.Time `json:"created_at"`
}

type Service struct {
	db        *db.DB
	hub       *websocket.Hub
	cfg       Config
	rolesCfg  roles.Config
	masterKey string

	IsSiteAdminFn             func(userID string) bool
	DecryptUsernameFn         func(userID string) string
	CountOnlineInGuild        func(guildID string) int
	VerifyUserPasswordFn      func(userID, password string) bool
	RecordAuditFn             func(actorID, guildID, targetType, targetID, action, reason string, metadata map[string]any)
	DeleteUserGuildMessagesFn func(guildID, userID string)
}

func NewService(db *db.DB, hub *websocket.Hub, cfg Config, rolesCfg roles.Config, masterKey string) *Service {
	return &Service{db: db, hub: hub, cfg: cfg, rolesCfg: rolesCfg, masterKey: masterKey}
}

func (s *Service) isSiteAdmin(userID string) bool {
	return s.IsSiteAdminFn != nil && s.IsSiteAdminFn(userID)
}

func (s *Service) decryptGuild(g *db.GuildRow) Guild {
	onlineCount := 0
	if s.CountOnlineInGuild != nil {
		onlineCount = s.CountOnlineInGuild(g.ID)
	}
	return Guild{
		ID:               g.ID,
		Name:             encryption.DecryptField(g.Name, s.masterKey),
		Icon:             g.Icon,
		Banner:           g.Banner,
		BannerCrop:       g.BannerCrop,
		Description:      encryption.DecryptField(g.Description, s.masterKey),
		OwnerID:          g.OwnerID,
		WelcomeChannelID: g.WelcomeChannelID,
		DefaultRoleID:    s.db.GetGuildDefaultRoleID(g.ID),
		MemberCount:      s.db.CountGuildMembers(g.ID),
		OnlineCount:      onlineCount,
		CreatedAt:        g.CreatedAt,
	}
}

// DecryptGuild is the exported version used by the invites package via an
// injected callback. Returns the same shape as the Guild type but does not
// require external packages to depend on the guilds package's type — they
// can accept any matching struct via interface or callback.
func (s *Service) DecryptGuild(g *db.GuildRow) Guild {
	return s.decryptGuild(g)
}

// GET /api/guilds — list guilds the user belongs to
func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	rows, err := s.db.ListGuildsForUser(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	out := make([]Guild, len(rows))
	for i, r := range rows {
		out[i] = s.decryptGuild(&r)
	}
	return c.JSON(200, out)
}

// GET /api/guilds/:guildId — get single guild
func (s *Service) Get(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrNotMember.Error()})
	}
	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	return c.JSON(200, s.decryptGuild(row))
}

// POST /api/guilds — create a guild
func (s *Service) Create(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) < s.cfg.MinName {
		return c.JSON(400, echo.Map{"error": fmt.Sprintf(errFmtNameTooShort, s.cfg.MinName)})
	}
	if len(req.Name) > s.cfg.MaxName {
		return c.JSON(400, echo.Map{"error": fmt.Sprintf(errFmtNameTooLong, s.cfg.MaxName)})
	}

	guildID := id.Generate()
	encName := encryption.EncryptField(req.Name, s.masterKey)
	nameHash := encryption.HashIdentifier(req.Name, s.masterKey)

	if err := s.db.InsertGuild(guildID, encName, nameHash, "", userID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}

	// Seed guild-local @everyone + Admin roles so perm checks against this
	// guild find real role rows with sensible position/permission values.
	// The IDs are newly generated per-guild — legacy AdminRoleID/DefaultRoleID
	// stay pinned to unthugs.
	adminRoleID := id.Generate()
	defaultRoleID := id.Generate()
	encAdminName := encryption.EncryptField(s.rolesCfg.AdminName, s.masterKey)
	encAdminDesc := encryption.EncryptField(s.rolesCfg.AdminDesc, s.masterKey)
	encEveryoneName := encryption.EncryptField(s.rolesCfg.EveryoneName, s.masterKey)
	encEveryoneDesc := encryption.EncryptField(s.rolesCfg.EveryoneDesc, s.masterKey)
	s.db.InsertRoleInGuild(adminRoleID, guildID, encAdminName, s.rolesCfg.AdminColor, encAdminDesc, s.rolesCfg.AdminPerms, 0, s.rolesCfg.AdminPosition, false, "user")
	s.db.InsertRoleInGuild(defaultRoleID, guildID, encEveryoneName, s.rolesCfg.DefaultColor, encEveryoneDesc, s.rolesCfg.DefaultPerms, 0, s.rolesCfg.DefaultPosition, false, "user")

	// Owner gets admin + default roles in this guild
	s.db.InsertGuildMember(guildID, userID, adminRoleID+","+defaultRoleID)

	// Seed a default #general text channel. Matches Discord UX — new guild
	// never lands on empty state.
	generalID := id.Generate()
	encGeneralName := encryption.EncryptField("general", s.masterKey)
	generalHash := encryption.HashIdentifier("general", s.masterKey)
	encGeneralDesc := encryption.EncryptField("", s.masterKey)
	s.db.InsertChannelInGuild(generalID, guildID, encGeneralName, generalHash, encGeneralDesc, "", userID, "text")

	row, _ := s.db.GetGuild(guildID)
	guild := s.decryptGuild(row)
	if s.hub != nil {
		if idx := s.hub.GuildIndex(); idx != nil {
			idx.AddMember(guildID, userID)
		}
		EmitListUpdate(s.hub, userID)
	}
	return c.JSON(201, guild)
}

// canManageGuild returns true if the user is the guild owner, has
// PermAdministrator, or has PermManageGuild in this guild. Used by the
// Update handler + avatar/banner routes so any of the three elevated roles
// can touch guild-level settings without a separate check at each site.
func (s *Service) canManageGuild(userID string, row *db.GuildRow) bool {
	if row == nil {
		return false
	}
	if row.OwnerID == userID {
		return true
	}
	perms := permissions.GetUserGuildPerms(s.db, userID, row.ID)
	return permissions.HasPerm(perms, permissions.PermManageGuild) || permissions.HasPerm(perms, permissions.PermAdministrator)
}

// CanManageGuild is the exported version used by other packages (invites) via
// a callback. Thin wrapper so future refactors can replace the private helper.
func (s *Service) CanManageGuild(userID string, row *db.GuildRow) bool {
	return s.canManageGuild(userID, row)
}

// EmitGuildUpdate is the exported version of emitUpdate, used by other packages
// (avatar, banner) via a callback to fire guild_update WS events when guild
// icon/banner changes.
func (s *Service) EmitGuildUpdate(guildID string, payload map[string]interface{}) {
	s.emitUpdate(guildID, payload)
}

// PUT /api/guilds/:guildId — update guild (name, description, icon)
func (s *Service) Update(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	if !s.canManageGuild(userID, row) {
		return c.JSON(403, echo.Map{"error": ErrNotOwner.Error()})
	}
	var req struct {
		Name             *string `json:"name"`
		Description      *string `json:"description"`
		WelcomeChannelID *string `json:"welcome_channel_id"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if len(name) < s.cfg.MinName {
			return c.JSON(400, echo.Map{"error": fmt.Sprintf(errFmtNameTooShort, s.cfg.MinName)})
		}
		if len(name) > s.cfg.MaxName {
			return c.JSON(400, echo.Map{"error": fmt.Sprintf(errFmtNameTooLong, s.cfg.MaxName)})
		}
		encName := encryption.EncryptField(name, s.masterKey)
		nameHash := encryption.HashIdentifier(name, s.masterKey)
		s.db.UpdateGuildName(guildID, encName, nameHash)
	}
	if req.Description != nil {
		desc := strings.TrimSpace(*req.Description)
		if len(desc) > 500 {
			desc = desc[:500]
		}
		encDesc := encryption.EncryptField(desc, s.masterKey)
		s.db.UpdateGuildDescription(guildID, encDesc)
	}
	if req.WelcomeChannelID != nil {
		wc := strings.TrimSpace(*req.WelcomeChannelID)
		if wc != "" {
			ch, err := s.db.GetChannel(wc)
			if err != nil || ch.GuildID != guildID || ch.Type != "text" {
				return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
			}
		}
		s.db.UpdateGuildWelcomeChannel(guildID, wc)
	}
	updated, _ := s.db.GetGuild(guildID)
	result := s.decryptGuild(updated)
	s.emitUpdate(guildID, map[string]interface{}{
		"id":                 guildID,
		"welcome_channel_id": result.WelcomeChannelID,
		"name":               result.Name,
		"description":        result.Description,
	})
	if s.RecordAuditFn != nil {
		s.RecordAuditFn(userID, guildID, auditlog.TargetGuild, guildID, auditlog.ActionGuildSettings, "",
			map[string]any{"name": result.Name})
	}
	return c.JSON(200, result)
}

// POST /api/v1/guilds/:guildId/transfer-ownership
// Body: { "new_owner_id": "...", "password": "..." }
// Owner-only. Password-confirmed. Target must be a non-bot member that isn't
// the current owner and isn't banned.
func (s *Service) TransferOwnership(c echo.Context) error {
	guildID := c.Param("guildId")
	actorID := c.Get("userID").(string)

	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	if row.OwnerID != actorID {
		return c.JSON(403, echo.Map{"error": ErrNotOwner.Error()})
	}

	var req struct {
		NewOwnerID string `json:"new_owner_id"`
		Password   string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	req.NewOwnerID = strings.TrimSpace(req.NewOwnerID)
	if req.NewOwnerID == "" || req.Password == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if req.NewOwnerID == actorID {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	if s.VerifyUserPasswordFn == nil || !s.VerifyUserPasswordFn(actorID, req.Password) {
		return c.JSON(401, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	if !s.db.IsGuildMember(guildID, req.NewOwnerID) {
		return c.JSON(400, echo.Map{"error": ErrNotAMember.Error()})
	}
	if s.db.IsGuildBanned(guildID, req.NewOwnerID) {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	if err := s.db.UpdateGuildOwner(guildID, req.NewOwnerID); err != nil {
		logger.Error("transfer ownership failed", "error", err, "guild", guildID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}

	if s.RecordAuditFn != nil {
		s.RecordAuditFn(actorID, guildID, "user", req.NewOwnerID, auditlog.ActionGuildOwnerTransfer, "",
			map[string]any{"from_user_id": actorID, "to_user_id": req.NewOwnerID})
	}

	s.emitUpdate(guildID, map[string]interface{}{
		"id":       guildID,
		"owner_id": req.NewOwnerID,
	})

	return c.JSON(200, echo.Map{"id": guildID, "owner_id": req.NewOwnerID})
}

func (s *Service) ExecDelete(guildID string) error {
	members, _ := s.db.ListGuildMembers(guildID)
	if err := s.db.DeleteGuild(guildID); err != nil {
		return err
	}
	if s.hub != nil {
		for _, m := range members {
			EmitListUpdate(s.hub, m.UserID)
		}
	}
	return nil
}

func (s *Service) Delete(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	if row.OwnerID != userID {
		return c.JSON(403, echo.Map{"error": ErrNotOwner.Error()})
	}
	if err := s.ExecDelete(guildID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"message": "guild deleted"})
}

// GET /api/guilds/:guildId/me — get current user's guild-specific roles & permissions
type memberRoleInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	Permissions int64  `json:"permissions"`
	Deny        int64  `json:"deny"`
	Position    int    `json:"position"`
}

func (s *Service) resolveGuildMemberRoles(guildID, userID string) ([]memberRoleInfo, int64, bool) {
	rolesStr := s.db.GetGuildMemberRoles(guildID, userID)
	if rolesStr == "" {
		rolesStr = s.db.GetGuildDefaultRoleID(guildID)
	}
	var roleIDs []string
	for _, id := range strings.Split(rolesStr, ",") {
		id = strings.TrimSpace(id)
		if id != "" {
			roleIDs = append(roleIDs, id)
		}
	}
	var roles []memberRoleInfo
	var perms int64
	var decided int64
	for _, rid := range roleIDs {
		name, color, allow, deny, position, err := s.db.GetRoleMini(rid)
		if err != nil {
			continue
		}
		roles = append(roles, memberRoleInfo{
			ID:          rid,
			Name:        encryption.DecryptField(name, s.masterKey),
			Color:       color,
			Permissions: allow,
			Deny:        deny,
			Position:    position,
		})
		newAllow := allow & ^decided
		newDeny := deny & ^decided
		perms |= newAllow
		perms &= ^newDeny
		decided |= newAllow | newDeny
	}
	row, _ := s.db.GetGuild(guildID)
	isOwner := row != nil && row.OwnerID == userID
	return roles, perms, isOwner
}

func (s *Service) Me(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrNotMember.Error()})
	}
	roles, perms, isOwner := s.resolveGuildMemberRoles(guildID, userID)
	return c.JSON(200, echo.Map{
		"guild_id":    guildID,
		"roles":       roles,
		"permissions": perms,
		"is_owner":    isOwner,
	})
}

// GET /api/guilds/:guildId/members/:userId — get a specific member's guild
// roles and owner status. Used by UserProfileModal to show per-guild roles
// when the modal is opened from within a guild context. Caller must be a
// member of the guild to view other members' roles.
func (s *Service) GetMember(c echo.Context) error {
	guildID := c.Param("guildId")
	targetID := c.Param("userId")
	actorID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, actorID) {
		return c.JSON(403, echo.Map{"error": ErrNotMember.Error()})
	}
	mem, err := s.db.GetGuildMember(guildID, targetID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "user is not a member of this guild"})
	}
	roles, _, isOwner := s.resolveGuildMemberRoles(guildID, targetID)
	return c.JSON(200, echo.Map{
		"user_id":   targetID,
		"roles":     roles,
		"is_owner":  isOwner,
		"joined_at": mem.JoinedAt.Format("2006-01-02"),
		"nickname":  mem.Nickname,
	})
}

// POST /api/guilds/:guildId/leave — leave a guild
func (s *Service) Leave(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	row, err := s.db.GetGuild(guildID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	if row.OwnerID == userID {
		return c.JSON(400, echo.Map{"error": ErrCannotLeaveAsOwner.Error()})
	}
	isBot := s.db.IsBot(userID)
	s.db.RemoveGuildMember(guildID, userID)
	if s.hub != nil {
		EmitMemberRemove(s.hub, guildID, userID)
		EmitListUpdate(s.hub, userID)
		if isBot {
			s.hub.EmitBotCommandsUpdated(guildID, userID)
		}
	}
	return c.JSON(200, echo.Map{"message": "left guild"})
}

func (s *Service) GetMyProfile(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrNotMember.Error()})
	}
	mem, err := s.db.GetGuildMember(guildID, userID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "not a member"})
	}
	return c.JSON(200, echo.Map{
		"guild_id": guildID,
		"user_id":  userID,
		"nickname": mem.Nickname,
	})
}

type updateMyProfileReq struct {
	Nickname *string `json:"nickname"`
}

func (s *Service) UpdateMyProfile(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": ErrNotMember.Error()})
	}
	var req updateMyProfileReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	patch := echo.Map{"guild_id": guildID, "user_id": userID}
	if req.Nickname != nil {
		nick := *req.Nickname
		if len(nick) > 32 {
			nick = nick[:32]
		}
		if err := s.db.UpdateGuildMemberNickname(guildID, userID, nick); err != nil {
			return c.JSON(500, echo.Map{"error": "failed to update nickname"})
		}
		patch["nickname"] = nick
	}
	if s.hub != nil {
		s.emitMemberProfile(guildID, patch)
	}
	return c.JSON(200, patch)
}