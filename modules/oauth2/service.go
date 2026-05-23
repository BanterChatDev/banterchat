package oauth2

import (
	"errors"
	"html/template"

	"github.com/labstack/echo/v4"

	"ror/modules/db"
	"ror/modules/guilds"
	"ror/modules/logger"
	"ror/modules/websocket"
)

type PublicApp struct {
	ID            string
	Name          string
	Discriminator string
	DisplayTag    string
	Description   string
	AvatarID      string
	BotUserID     string
}

type Service struct {
	db  *db.DB
	hub *websocket.Hub

	LookupAppPublic  func(appID string) (*PublicApp, error)
	CanManageGuild   func(userID string, row *db.GuildRow) bool
	DecryptGuildName func(row *db.GuildRow) string
	SessionUserID    func(c echo.Context) string
	BuildMember      func(guildID, userID string) map[string]interface{}
	CreateBotRole    func(guildID, botName, botUserID string, perms int64) (roleID string, err error)

	botInviteTemplate *template.Template
}

func NewService(d *db.DB, hub *websocket.Hub) *Service {
	return &Service{db: d, hub: hub}
}

var (
	ErrUnknownApp    = errors.New("unknown application")
	ErrCannotManage  = errors.New("you do not have permission to manage this guild")
	ErrAlreadyMember = errors.New("bot is already in this guild")
	ErrGuildNotFound = errors.New("guild not found")
)

type appInfoResp struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Discriminator string `json:"discriminator"`
	DisplayTag    string `json:"display_tag"`
	Description   string `json:"description"`
	AvatarID      string `json:"avatar_id"`
	BotUserID     string `json:"bot_user_id"`
}

type authorizeReq struct {
	ClientID    string `json:"client_id"`
	GuildID     string `json:"guild_id"`
	Permissions int64  `json:"permissions"`
}

func (s *Service) GetAppInfo(c echo.Context) error {
	clientID := c.QueryParam("client_id")
	if clientID == "" {
		return c.JSON(400, echo.Map{"error": "missing client_id"})
	}
	if s.LookupAppPublic == nil {
		return c.JSON(500, echo.Map{"error": "oauth2 not configured"})
	}
	app, err := s.LookupAppPublic(clientID)
	if err != nil || app == nil {
		return c.JSON(404, echo.Map{"error": ErrUnknownApp.Error()})
	}
	return c.JSON(200, appInfoResp{
		ID:            app.ID,
		Name:          app.Name,
		Discriminator: app.Discriminator,
		DisplayTag:    app.DisplayTag,
		Description:   app.Description,
		AvatarID:      app.AvatarID,
		BotUserID:     app.BotUserID,
	})
}

func (s *Service) ListManageableGuilds(c echo.Context) error {
	userID := c.Get("userID").(string)
	rows, err := s.db.ListGuildsForUser(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to list guilds"})
	}
	out := []echo.Map{}
	for i := range rows {
		if s.CanManageGuild == nil || !s.CanManageGuild(userID, &rows[i]) {
			continue
		}
		name := ""
		if s.DecryptGuildName != nil {
			name = s.DecryptGuildName(&rows[i])
		}
		out = append(out, echo.Map{
			"id":   rows[i].ID,
			"name": name,
			"icon": rows[i].Icon,
		})
	}
	return c.JSON(200, echo.Map{"guilds": out})
}

func (s *Service) Authorize(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req authorizeReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	if req.ClientID == "" || req.GuildID == "" {
		return c.JSON(400, echo.Map{"error": "client_id and guild_id required"})
	}
	if s.LookupAppPublic == nil {
		return c.JSON(500, echo.Map{"error": "oauth2 not configured"})
	}
	app, err := s.LookupAppPublic(req.ClientID)
	if err != nil || app == nil {
		return c.JSON(404, echo.Map{"error": ErrUnknownApp.Error()})
	}
	guildRow, err := s.db.GetGuild(req.GuildID)
	if err != nil || guildRow == nil {
		return c.JSON(404, echo.Map{"error": ErrGuildNotFound.Error()})
	}
	if s.CanManageGuild == nil || !s.CanManageGuild(userID, guildRow) {
		return c.JSON(403, echo.Map{"error": ErrCannotManage.Error()})
	}
	if s.db.IsGuildMember(req.GuildID, app.BotUserID) {
		return c.JSON(409, echo.Map{"error": ErrAlreadyMember.Error()})
	}

	defaultRoleID := s.db.GetGuildDefaultRoleID(req.GuildID)
	logger.Info("oauth2: Authorize",
		"guild", req.GuildID,
		"app", app.Name,
		"bot_user_id", app.BotUserID,
		"perms_request", req.Permissions,
	)
	var botRoleID string
	if s.CreateBotRole != nil {
		if rid, rerr := s.CreateBotRole(req.GuildID, app.Name, app.BotUserID, req.Permissions); rerr == nil {
			botRoleID = rid
		} else {
			logger.Error("oauth2: CreateBotRole hook failed", "error", rerr, "guild", req.GuildID, "app", app.Name)
		}
	} else {
		logger.Error("oauth2: CreateBotRole hook is nil", "guild", req.GuildID, "app", app.Name)
	}

	roles := defaultRoleID
	if botRoleID != "" {
		roles = botRoleID + "," + defaultRoleID
	}
	if err := s.db.InsertGuildMember(req.GuildID, app.BotUserID, roles); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to add bot"})
	}

	if s.hub != nil {
		var member map[string]interface{}
		if s.BuildMember != nil {
			member = s.BuildMember(req.GuildID, app.BotUserID)
		}
		guilds.EmitMemberAdd(s.hub, req.GuildID, app.BotUserID, true, member)
		guilds.EmitListUpdate(s.hub, app.BotUserID)
	}
	if guilds.OnMemberJoin != nil {
		go guilds.OnMemberJoin(req.GuildID, app.BotUserID)
	}
	s.hub.EmitBotCommandsUpdated(req.GuildID, app.BotUserID)

	return c.JSON(200, echo.Map{"guild_id": req.GuildID, "bot_user_id": app.BotUserID})
}