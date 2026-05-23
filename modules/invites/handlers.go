package invites

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/db"
	"ror/modules/guilds"
	"ror/modules/id"
)

// Invite is the JSON shape returned for guild invites.
type Invite struct {
	ID        string     `json:"id"`
	GuildID   string     `json:"guild_id"`
	Code      string     `json:"code"`
	CreatedBy string     `json:"created_by"`
	Uses      int        `json:"uses"`
	MaxUses   int        `json:"max_uses"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func generateCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// invitePreview bundles a DB invite row with its decrypted guild.
type invitePreview struct {
	Invite      *db.GuildInviteRow
	Guild       GuildInfo
	VanitySlug  string
}

func (s *Service) resolveInvitePreview(codeOrSlug string) (*invitePreview, error) {
	inv, err := s.db.GetGuildInviteByCode(codeOrSlug)
	vanitySlug := ""
	if err != nil {
		resolved, ok := s.resolveVanityToInvite(codeOrSlug)
		if !ok {
			return nil, ErrInviteNotFound
		}
		inv = resolved
		vanitySlug = normalizeSlug(codeOrSlug)
	} else {
		expired := inv.ExpiresAt != nil && time.Now().After(*inv.ExpiresAt)
		full := inv.MaxUses > 0 && inv.Uses >= inv.MaxUses
		if expired || full {
			s.db.DeleteGuildInvite(inv.ID)
			return nil, ErrInviteUnusable
		}
	}
	row, err := s.db.GetGuild(inv.GuildID)
	if err != nil {
		return nil, ErrInviteNotFound
	}
	if s.DecryptGuild == nil {
		return nil, ErrServerError
	}
	return &invitePreview{Invite: inv, Guild: s.DecryptGuild(row), VanitySlug: vanitySlug}, nil
}

// POST /api/guilds/:guildId/invites — create an invite
func (s *Service) CreateInvite(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": "you are not a member of this guild"})
	}
	var req struct {
		MaxUses   int `json:"max_uses"`
		ExpiresIn int `json:"expires_in"`
	}
	c.Bind(&req)

	const maxInviteUses = 10000
	const maxExpirySeconds = 60 * 60 * 24 * 90
	if req.MaxUses < 0 {
		req.MaxUses = 0
	}
	if req.MaxUses > maxInviteUses {
		req.MaxUses = maxInviteUses
	}
	if req.ExpiresIn < 0 {
		req.ExpiresIn = 0
	}
	if req.ExpiresIn > maxExpirySeconds {
		req.ExpiresIn = maxExpirySeconds
	}

	invID := id.Generate()
	code := generateCode()
	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(req.ExpiresIn) * time.Second)
		expiresAt = &t
	}
	if err := s.db.InsertGuildInvite(invID, guildID, userID, code, req.MaxUses, expiresAt); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(201, Invite{
		ID:        invID,
		GuildID:   guildID,
		Code:      code,
		CreatedBy: userID,
		Uses:      0,
		MaxUses:   req.MaxUses,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	})
}

// GET /api/guilds/:guildId/invites — list invites for a guild
func (s *Service) ListInvites(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": "you are not a member of this guild"})
	}
	rows, err := s.db.ListGuildInvites(guildID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	out := make([]Invite, len(rows))
	for i, r := range rows {
		out[i] = Invite{ID: r.ID, GuildID: r.GuildID, Code: r.Code, CreatedBy: r.CreatedBy, Uses: r.Uses, MaxUses: r.MaxUses, ExpiresAt: r.ExpiresAt, CreatedAt: r.CreatedAt}
	}
	return c.JSON(200, out)
}

// DELETE /api/guilds/:guildId/invites/:code — revoke an invite.
// Only the invite's creator, the guild owner, or a user with
// PermManageGuild can revoke.
func (s *Service) DeleteInvite(c echo.Context) error {
	guildID := c.Param("guildId")
	code := c.Param("code")
	userID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, userID) {
		return c.JSON(403, echo.Map{"error": "you are not a member of this guild"})
	}
	inv, err := s.db.GetGuildInviteByCode(code)
	if err != nil || inv.GuildID != guildID {
		return c.JSON(404, echo.Map{"error": ErrInviteNotFound.Error()})
	}
	if inv.CreatedBy != userID {
		row, gerr := s.db.GetGuild(guildID)
		if gerr != nil || s.CanManageGuild == nil || !s.CanManageGuild(userID, row) {
			return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
		}
	}
	if err := s.db.DeleteGuildInvite(inv.ID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"message": "invite deleted"})
}

// POST /api/invites/:code/join — join a guild via invite code or vanity slug
func (s *Service) JoinByInvite(c echo.Context) error {
	code := c.Param("code")
	userID := c.Get("userID").(string)
	inv, err := s.db.GetGuildInviteByCode(code)
	vanitySlug := ""
	if err != nil {
		resolved, ok := s.resolveVanityToInvite(code)
		if !ok {
			return c.JSON(404, echo.Map{"error": ErrInviteNotFound.Error()})
		}
		inv = resolved
		vanitySlug = normalizeSlug(code)
	}
	if s.db.IsGuildBanned(inv.GuildID, userID) {
		return c.JSON(403, echo.Map{"error": "you are banned from this guild"})
	}
	if s.db.IsGuildMember(inv.GuildID, userID) {
		if vanitySlug != "" {
			s.bumpVanityUseCount(vanitySlug)
		}
		return c.JSON(200, echo.Map{"guild_id": inv.GuildID, "message": "already a member"})
	}
	if vanitySlug == "" {
		consumed, newUses, exhausted, cerr := s.db.ConsumeGuildInvite(inv.ID)
		if cerr != nil {
			return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
		}
		if !consumed {
			s.db.DeleteGuildInvite(inv.ID)
			return c.JSON(410, echo.Map{"error": ErrInviteUnusable.Error()})
		}
		if exhausted {
			s.db.DeleteGuildInvite(inv.ID)
			if s.hub != nil {
				s.hub.EmitToGuild(inv.GuildID, "invite_delete", map[string]interface{}{
					"guild_id": inv.GuildID,
					"id":       inv.ID,
					"code":     inv.Code,
				})
			}
		} else if s.hub != nil {
			s.hub.EmitToGuild(inv.GuildID, "invite_update", map[string]interface{}{
				"guild_id": inv.GuildID,
				"id":       inv.ID,
				"code":     inv.Code,
				"uses":     newUses,
			})
		}
	}
	defaultRoleID := s.db.GetGuildDefaultRoleID(inv.GuildID)
	s.db.InsertGuildMember(inv.GuildID, userID, defaultRoleID)
	if vanitySlug != "" {
		s.bumpVanityUseCount(vanitySlug)
	}

	row, _ := s.db.GetGuild(inv.GuildID)
	var guild GuildInfo
	if s.DecryptGuild != nil && row != nil {
		guild = s.DecryptGuild(row)
	}

	if s.hub != nil {
		var member map[string]interface{}
		if s.BuildMember != nil {
			member = s.BuildMember(inv.GuildID, userID)
		}
		guilds.EmitMemberAdd(s.hub, inv.GuildID, userID, false, member)
		guilds.EmitListUpdate(s.hub, userID)
	}

	if guilds.OnMemberJoin != nil {
		go guilds.OnMemberJoin(inv.GuildID, userID)
	}

	return c.JSON(200, echo.Map{"guild_id": inv.GuildID, "guild": guild})
}

// GET /api/invites/:code — preview the guild behind an invite
func (s *Service) GetInvitePreview(c echo.Context) error {
	prev, err := s.resolveInvitePreview(c.Param("code"))
	if err != nil {
		status := 404
		if err == ErrInviteUnusable {
			status = 410
		}
		return c.JSON(status, echo.Map{"error": err.Error()})
	}
	g := prev.Guild
	inv := prev.Invite
	userID, _ := c.Get("userID").(string)
	isMember := userID != "" && s.db.IsGuildMember(g.ID, userID)
	return c.JSON(200, echo.Map{
		"code":              inv.Code,
		"guild_id":          g.ID,
		"guild_name":        g.Name,
		"guild_icon":        g.Icon,
		"guild_banner":      g.Banner,
		"guild_banner_crop": g.BannerCrop,
		"guild_description": g.Description,
		"member_count":      g.MemberCount,
		"uses":              inv.Uses,
		"max_uses":          inv.MaxUses,
		"expires_at":        inv.ExpiresAt,
		"is_member":         isMember,
	})
}