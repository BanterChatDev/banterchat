package admin

import (
	"sort"
	"strings"

	"ror/modules/db"
	"ror/modules/guilds"
	"ror/modules/search"

	"github.com/labstack/echo/v4"
)

type adminUserRow struct {
	row       *db.UserRow
	name      string
	banned    bool
	suspended bool
	online    bool
}

func (s *Service) listUsersPage(limit, offset int, query string, includeBanned bool, sortMode, filterMode string) ([]echo.Map, int, error) {
	rows, err := s.db.ListAllUsersIncludingBanned()
	if err != nil {
		return nil, 0, err
	}
	prepared := make([]adminUserRow, 0, len(rows))
	for i := range rows {
		u := &rows[i]
		if u.IsBot {
			continue
		}
		banned := s.db.IsUserBanned(u.ID)
		if filterMode == "" && banned && !includeBanned {
			continue
		}
		online := false
		if s.hub != nil {
			online = s.hub.IsOnline(u.ID)
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
		case "all":
		}
		prepared = append(prepared, adminUserRow{
			row:       u,
			name:      s.users.DecryptUsername(u),
			banned:    banned,
			suspended: s.db.IsUserSuspended(u.ID),
			online:    online,
		})
	}
	filtered := search.Filter(prepared, query, func(u *adminUserRow) string { return u.name })
	switch sortMode {
	case "name_desc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].name) > strings.ToLower(filtered[j].name)
		})
	case "created_asc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].row.CreatedAt.Before(filtered[j].row.CreatedAt)
		})
	case "created_desc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].row.CreatedAt.After(filtered[j].row.CreatedAt)
		})
	default:
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].name) < strings.ToLower(filtered[j].name)
		})
	}
	page, total := search.Paginate(filtered, offset, limit)
	items := make([]echo.Map, len(page))
	for i, u := range page {
		items[i] = echo.Map{
			"id":            u.row.ID,
			"username":      u.name,
			"avatar_id":     u.row.Avatar,
			"created_at":    u.row.CreatedAt.Format("2006-01-02"),
			"is_bot":        u.row.IsBot,
			"banned":        u.banned,
			"suspended":     u.suspended,
			"online":        u.online,
			"last_login_ip": u.row.LastLoginIP,
			"is_site_admin": s.users.IsSiteAdmin(u.row.ID),
		}
	}
	return items, total, nil
}

type adminGuildRow struct {
	g            guilds.Guild
	memberCount  int
	onlineCount  int
	messageCount int
}

func (s *Service) listGuildsPage(limit, offset int, query, sortMode, filterMode string) ([]echo.Map, int, error) {
	rows, err := s.db.ListAllGuilds()
	if err != nil {
		return nil, 0, err
	}
	prepared := make([]adminGuildRow, 0, len(rows))
	for i := range rows {
		g := s.guilds.DecryptGuild(&rows[i])
		entry := adminGuildRow{
			g:            g,
			memberCount:  s.db.CountGuildMembers(g.ID),
			onlineCount:  s.onlineInGuild(g.ID),
			messageCount: s.db.CountMessagesInGuild(g.ID),
		}
		switch filterMode {
		case "active":
			if entry.onlineCount <= 0 {
				continue
			}
		case "empty":
			if entry.messageCount > 0 {
				continue
			}
		case "all", "":
		}
		prepared = append(prepared, entry)
	}
	filtered := search.Filter(prepared, query, func(r *adminGuildRow) string { return r.g.Name })
	switch sortMode {
	case "name_desc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].g.Name) > strings.ToLower(filtered[j].g.Name)
		})
	case "name_asc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].g.Name) < strings.ToLower(filtered[j].g.Name)
		})
	case "created_asc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].g.CreatedAt.Before(filtered[j].g.CreatedAt)
		})
	case "members_desc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].memberCount > filtered[j].memberCount
		})
	case "messages_desc":
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].messageCount > filtered[j].messageCount
		})
	default:
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].g.CreatedAt.After(filtered[j].g.CreatedAt)
		})
	}
	page, total := search.Paginate(filtered, offset, limit)
	items := make([]echo.Map, len(page))
	for i, r := range page {
		items[i] = echo.Map{
			"id":            r.g.ID,
			"name":          r.g.Name,
			"icon":          r.g.Icon,
			"owner_id":      r.g.OwnerID,
			"member_count":  r.memberCount,
			"online_count":  r.onlineCount,
			"message_count": r.messageCount,
			"created_at":    r.g.CreatedAt.Format("2006-01-02"),
		}
	}
	return items, total, nil
}

func (s *Service) guildDetailView(guildID, currentUserID string) (echo.Map, error) {
	row, err := s.db.GetGuild(guildID)
	if err != nil || row == nil {
		return nil, ErrGuildNotFound
	}
	g := s.guilds.DecryptGuild(row)
	return echo.Map{
		"id":             g.ID,
		"name":           g.Name,
		"description":    g.Description,
		"icon":           g.Icon,
		"banner":         g.Banner,
		"owner_id":       g.OwnerID,
		"owner_username": s.users.DecryptUsernameByID(g.OwnerID),
		"member_count":   s.db.CountGuildMembers(guildID),
		"online_count":   s.onlineInGuild(guildID),
		"banned_count":   s.db.CountGuildBans(guildID),
		"message_count":  s.db.CountMessagesInGuild(guildID),
		"channel_count":  s.db.CountChannelsInGuild(guildID),
		"created_at":     g.CreatedAt.Format("2006-01-02"),
		"is_member":      s.db.IsGuildMember(guildID, currentUserID),
	}, nil
}

func (s *Service) statsSnapshot() echo.Map {
	usersAll, _ := s.db.ListAllUsersIncludingBanned()
	bannedCount := s.db.CountBannedUsers()
	onlineCount := 0
	var byClient map[string]int
	if s.hub != nil {
		onlineCount = len(s.hub.OnlineUserIDs())
		byClient = s.hub.OnlineByClient()
	}
	if byClient == nil {
		byClient = map[string]int{"web": 0, "desktop": 0}
	}
	return echo.Map{
		"users":                len(usersAll) - bannedCount,
		"users_online":         onlineCount,
		"users_online_web":     byClient["web"],
		"users_online_desktop": byClient["desktop"],
		"guilds":               s.db.CountGuilds(),
		"messages":             s.db.CountAllMessages(),
	}
}

func (s *Service) listSiteAdminsView() (echo.Map, error) {
	rows, err := s.db.ListSiteAdmins()
	if err != nil {
		return nil, err
	}
	out := make([]echo.Map, 0, len(rows))
	for _, r := range rows {
		out = append(out, echo.Map{
			"user_id":     r.UserID,
			"username":    s.users.DecryptUsernameByID(r.UserID),
			"promoted_by": r.PromotedBy,
			"promoted_at": r.PromotedAt,
			"note":        r.Note,
		})
	}
	return echo.Map{"db_admins": out, "config_admins": s.users.ConfigSiteAdminIDs()}, nil
}