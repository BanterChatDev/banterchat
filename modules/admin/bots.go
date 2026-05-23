package admin

import (
	"errors"
	"sort"
	"strings"

	"ror/modules/db"
	"ror/modules/search"

	"github.com/labstack/echo/v4"
)

var ErrBotNotFound = errors.New("bot not found")

type adminBotRow struct {
	app        db.BotAppRow
	ownerName  string
	banned     bool
	online     bool
	guildCount int
}

func (s *Service) listBotsPage(limit, offset int, query, sortMode, filterMode string) ([]echo.Map, int, error) {
	rows, err := s.db.ListAllBotApps()
	if err != nil {
		return nil, 0, err
	}
	prepared := make([]adminBotRow, 0, len(rows))
	for i := range rows {
		app := rows[i]
		banned := s.db.IsUserBanned(app.BotUserID)
		online := false
		if s.hub != nil {
			online = s.hub.IsOnline(app.BotUserID)
		}
		switch filterMode {
		case "banned":
			if !banned {
				continue
			}
		case "online":
			if banned || !online {
				continue
			}
		case "offline":
			if banned || online {
				continue
			}
		case "verified":
			if !app.Verified {
				continue
			}
		case "unverified":
			if app.Verified {
				continue
			}
		case "all", "":
		}
		guildIDs, _ := s.db.ListGuildIDsForUser(app.BotUserID)
		prepared = append(prepared, adminBotRow{
			app:        app,
			ownerName:  s.users.DecryptUsernameByID(app.OwnerID),
			banned:     banned,
			online:     online,
			guildCount: len(guildIDs),
		})
	}
	filtered := search.Filter(prepared, query, func(b *adminBotRow) string { return b.app.Name + " " + b.ownerName })
	switch sortMode {
	case "name_desc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].app.Name) > strings.ToLower(filtered[j].app.Name)
		})
	case "name_asc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].app.Name) < strings.ToLower(filtered[j].app.Name)
		})
	case "created_asc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].app.CreatedAt.Before(filtered[j].app.CreatedAt)
		})
	case "guilds_desc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].guildCount > filtered[j].guildCount
		})
	default:
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].app.CreatedAt.After(filtered[j].app.CreatedAt)
		})
	}
	page, total := search.Paginate(filtered, offset, limit)
	items := make([]echo.Map, len(page))
	for i, b := range page {
		avatarID := ""
		if s.bots != nil && s.bots.GetAvatarID != nil {
			avatarID = s.bots.GetAvatarID(b.app.BotUserID)
		}
		items[i] = echo.Map{
			"id":             b.app.ID,
			"name":           b.app.Name,
			"bot_user_id":    b.app.BotUserID,
			"owner_id":       b.app.OwnerID,
			"owner_username": b.ownerName,
			"avatar_id":      avatarID,
			"verified":       b.app.Verified,
			"banned":         b.banned,
			"online":         b.online,
			"guild_count":    b.guildCount,
			"created_at":     b.app.CreatedAt.Format("2006-01-02"),
		}
	}
	return items, total, nil
}

func (s *Service) botDetailView(appID string) (echo.Map, error) {
	app, err := s.db.GetBotAppByID(appID)
	if err != nil || app == nil {
		return nil, ErrBotNotFound
	}
	banned := s.db.IsUserBanned(app.BotUserID)
	online := false
	if s.hub != nil {
		online = s.hub.IsOnline(app.BotUserID)
	}
	guildIDs, _ := s.db.ListGuildIDsForUser(app.BotUserID)
	avatarID := ""
	if s.bots != nil && s.bots.GetAvatarID != nil {
		avatarID = s.bots.GetAvatarID(app.BotUserID)
	}
	return echo.Map{
		"id":             app.ID,
		"name":           app.Name,
		"description":    app.Description,
		"bot_user_id":    app.BotUserID,
		"owner_id":       app.OwnerID,
		"owner_username": s.users.DecryptUsernameByID(app.OwnerID),
		"avatar_id":      avatarID,
		"verified":       app.Verified,
		"banned":         banned,
		"online":         online,
		"guild_count":    len(guildIDs),
		"created_at":     app.CreatedAt.Format("2006-01-02"),
		"updated_at":     app.UpdatedAt.Format("2006-01-02"),
	}, nil
}

func (s *Service) ListBots(c echo.Context) error {
	limit := parseInt(c.QueryParam("limit"), 50, 1, 200)
	offset := parseInt(c.QueryParam("offset"), 0, 0, 1<<30)
	q := c.QueryParam("search")
	sortMode := c.QueryParam("sort")
	filterMode := c.QueryParam("filter")
	items, total, err := s.listBotsPage(limit, offset, q, sortMode, filterMode)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"bots": items, "total": total, "offset": offset, "limit": limit})
}

func (s *Service) BotDetail(c echo.Context) error {
	view, err := s.botDetailView(c.Param("appId"))
	if err != nil {
		return c.JSON(404, echo.Map{"error": err.Error()})
	}
	return c.JSON(200, view)
}