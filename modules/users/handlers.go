package users

import (
	"ror/modules/usernames"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/encryption"
	"ror/modules/flairs"
	"ror/modules/guilds"
	"ror/modules/pagination"
	"ror/modules/permissions"
	"ror/modules/presence"
)

func (s *Service) Me(c echo.Context) error {
	userID := c.Get("userID").(string)
	resp, err := s.BuildUserResponse(userID, userID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	keyfileHash := s.db.GetUserKeyfileHash(userID)
	resp["has_keyfile"] = keyfileHash != ""
	resp["keyfile_fingerprint"] = keyfileHash
	return c.JSON(200, resp)
}

func (s *Service) GetProfile(c echo.Context) error {
	viewerID, _ := c.Get("userID").(string)
	resp, err := s.BuildUserResponse(viewerID, c.Param("id"))
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	return c.JSON(200, resp)
}

func (s *Service) UpdateFlairHandler(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Flair string `json:"flair"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if !flairs.Valid(req.Flair) {
		return c.JSON(400, echo.Map{"error": "invalid flair"})
	}
	if err := s.db.SetUserFlair(userID, req.Flair); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	resp, err := s.BuildUserResponse(userID, userID)
	if err == nil {
		s.emitUserUpdate(userID, resp)
	}
	return c.JSON(200, echo.Map{"flair": req.Flair})
}

// ProfileFieldsPatch is the set of profile fields that can be updated
// on a user row. Pointer fields distinguish "not set" (nil, skip) from
// "set to empty string" (empty, write and emit). Used by both the
// session-authed user-profile flow and the bot owner's update-app
// flow, where the owner is editing their bot's paired user row.
type ProfileFieldsPatch struct {
	DisplayName *string
	Bio         *string
}

// ApplyProfileFields validates, encrypts, and writes the given patch
// fields to the targetUserID's user row, then emits a user_update WS
// event with the full fresh response so subscribers refresh.
//
// Returns an HTTP-style status + error message so both the user and
// bot-owner handlers can surface it directly. Username changes are
// NOT handled here — they're split into separate flows (users have
// plain usernames, bots have bot_username/bot_discriminator) that
// don't share enough logic to usefully unify.
func (s *Service) ApplyProfileFields(targetUserID string, patch ProfileFieldsPatch) (echo.Map, int, error) {
	user, err := s.GetUserByID(targetUserID)
	if err != nil {
		return nil, 500, ErrServerError
	}
	userKey := s.GetUserKey(user)

	if patch.DisplayName != nil {
		dn := strings.TrimSpace(*patch.DisplayName)
		if len([]rune(dn)) > 32 {
			return nil, 400, errDisplayNameTooLong
		}
		encDN := dn
		if dn != "" && userKey != "" {
			if enc, err := encryption.Encrypt(dn, userKey); err == nil {
				encDN = enc
			}
		}
		if err := s.db.UpdateUserDisplayName(targetUserID, encDN); err != nil {
			return nil, 500, ErrServerError
		}
		InvalidateUserCache(targetUserID)
	}

	if patch.Bio != nil {
		bio := strings.TrimSpace(*patch.Bio)
		if err := ValidateBio(bio, s.cfg); err != nil {
			return nil, 400, err
		}
		encBio := bio
		if userKey != "" {
			if enc, err := encryption.Encrypt(bio, userKey); err == nil {
				encBio = enc
			}
		}
		if err := s.UpdateBio(targetUserID, encBio); err != nil {
			return nil, 500, ErrServerError
		}
	}

	resp, err := s.BuildUserResponse(targetUserID, targetUserID)
	if err != nil {
		return nil, 500, ErrServerError
	}
	s.emitUserUpdate(targetUserID, resp)
	return resp, 200, nil
}

func (s *Service) UpdateUserHandler(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Username    *string `json:"username,omitempty"`
		DisplayName *string `json:"display_name,omitempty"`
		Bio         *string `json:"bio,omitempty"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	user, err := s.GetUserByID(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	userKey := s.GetUserKey(user)

	if req.Username != nil {
		name := usernames.Sanitize(*req.Username)
		if err := usernames.Validate(name, s.minUsername, s.maxUsername, s.blacklist); err != nil {
			return c.JSON(400, echo.Map{"error": err.Error()})
		}
		usernameHash := encryption.HashIdentifier(name, s.masterKey)
		existing, err := s.GetUserByUsername(usernameHash)
		if err == nil && existing.ID != userID {
			return c.JSON(409, echo.Map{"error": "username is already taken"})
		}
		encUsername := name
		if userKey != "" {
			if enc, err := encryption.Encrypt(name, userKey); err == nil {
				encUsername = enc
			}
		}
		if err := s.UpdateUsername(userID, encUsername, usernameHash); err != nil {
			if strings.Contains(err.Error(), "UNIQUE") {
				return c.JSON(409, echo.Map{"error": "username is already taken"})
			}
			return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
		}
	}

	resp, status, err := s.ApplyProfileFields(userID, ProfileFieldsPatch{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
	})
	if err != nil {
		return c.JSON(status, echo.Map{"error": err.Error()})
	}
	return c.JSON(status, resp)
}

type memberEntry struct {
	u           UserWithRoles
	username    string
	displayName string
	bio         string
	online      bool
}

type memberListOpts struct {
	search       string
	offset       int
	limit        int
	channelID    string
	guildID      string // explicit guild scope; falls back to channel→guild derivation when empty
	includeBanned bool
	actorID      string
}

type sortedMemberEntry struct {
	id           string
	username     string
	usernameLC   string
	displayName  string
	bio          string
	avatarID     string
	bannerID     string
	createdAt    time.Time
	isBot        bool
	roles        string
	joinedAt     string
}

type memberListCacheEntry struct {
	sorted   []sortedMemberEntry
	expires  time.Time
}

var memberListCache sync.Map

const memberListCacheTTL = 60 * time.Second

func InvalidateMemberListCache(guildID string) {
	if guildID == "" {
		memberListCache.Range(func(k, _ any) bool {
			memberListCache.Delete(k)
			return true
		})
		return
	}
	memberListCache.Delete(guildID)
}

func (s *Service) buildSortedGuildMembers(guildID string) []sortedMemberEntry {
	dbRows, err := s.db.ListUsersInGuild(guildID, false)
	if err != nil || len(dbRows) == 0 {
		return nil
	}
	memberRows, _ := s.db.ListGuildMembers(guildID)
	guildJoinedAt := make(map[string]string, len(memberRows))
	guildMemberRoles := make(map[string]string, len(memberRows))
	for _, r := range memberRows {
		guildJoinedAt[r.UserID] = r.JoinedAt.Format(dateFormat)
		guildMemberRoles[r.UserID] = r.Roles
	}
	out := make([]sortedMemberEntry, 0, len(dbRows))
	for i := range dbRows {
		u := &dbRows[i]
		dec := s.decryptFields(u)
		out = append(out, sortedMemberEntry{
			id:          u.ID,
			username:    dec.Username,
			usernameLC:  strings.ToLower(dec.Username),
			displayName: dec.DisplayName,
			bio:         dec.Bio,
			avatarID:    s.avatarFor(u.ID),
			bannerID:    s.bannerFor(u.ID),
			createdAt:   u.CreatedAt,
			isBot:       u.IsBot,
			roles:       guildMemberRoles[u.ID],
			joinedAt:    guildJoinedAt[u.ID],
		})
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].usernameLC < out[j].usernameLC
	})
	return out
}

func (s *Service) getCachedGuildMembers(guildID string) []sortedMemberEntry {
	now := time.Now()
	if cached, ok := memberListCache.Load(guildID); ok {
		if e, ok := cached.(memberListCacheEntry); ok && now.Before(e.expires) {
			return e.sorted
		}
	}
	sorted := s.buildSortedGuildMembers(guildID)
	if sorted == nil {
		return nil
	}
	memberListCache.Store(guildID, memberListCacheEntry{sorted: sorted, expires: now.Add(memberListCacheTTL)})
	return sorted
}

func (s *Service) buildMemberList(opts memberListOpts) ([]echo.Map, int, int, int, error) {
	scopeGuildID := opts.guildID
	if scopeGuildID == "" && opts.channelID != "" {
		scopeGuildID = s.db.GetChannelGuildID(opts.channelID)
	}
	if scopeGuildID != "" && !opts.includeBanned {
		return s.buildMemberListCached(scopeGuildID, opts)
	}
	var all []UserWithRoles
	var err error
	if scopeGuildID != "" {
		dbRows, derr := s.db.ListUsersInGuild(scopeGuildID, opts.includeBanned)
		if derr != nil {
			return nil, 0, 0, 0, derr
		}
		all = make([]UserWithRoles, len(dbRows))
		for i, r := range dbRows {
			all[i] = UserWithRoles{User: r}
		}
	} else if opts.includeBanned {
		all, err = s.ListUsersIncludingBanned()
	} else {
		all, err = s.ListUsers()
	}
	if err != nil {
		return nil, 0, 0, 0, err
	}
	var guildMemberSet map[string]bool
	var guildJoinedAt map[string]string
	var guildMemberRoles map[string]string
	var guildBannedSet map[string]bool
	if scopeGuildID != "" {
		rows, merr := s.db.ListGuildMembers(scopeGuildID)
		if merr == nil {
			guildMemberSet = make(map[string]bool, len(rows))
			guildJoinedAt = make(map[string]string, len(rows))
			guildMemberRoles = make(map[string]string, len(rows))
			for _, r := range rows {
				guildMemberSet[r.UserID] = true
				guildJoinedAt[r.UserID] = r.JoinedAt.Format(dateFormat)
				guildMemberRoles[r.UserID] = r.Roles
			}
		}
		if opts.includeBanned {
			bans, berr := s.db.ListGuildBans(scopeGuildID)
			if berr == nil {
				guildBannedSet = make(map[string]bool, len(bans))
				for _, b := range bans {
					guildBannedSet[b.UserID] = true
				}
			}
		}
	}

	onlineIDs := s.hub.OnlineUserIDs()
	onlineMap := make(map[string]bool, len(onlineIDs))
	for _, id := range onlineIDs {
		onlineMap[id] = true
	}

	var channelPerms map[string]int64
	if opts.channelID != "" {
		candidates := make([]string, 0, len(all))
		for _, u := range all {
			if guildMemberSet != nil {
				inMembers := guildMemberSet[u.ID]
				inBanned := guildBannedSet != nil && guildBannedSet[u.ID]
				if !inMembers && !inBanned {
					continue
				}
			}
			candidates = append(candidates, u.ID)
		}
		channelPerms = permissions.ResolveChannelPermsBatch(s.db, candidates, opts.channelID)
	}
	items := make([]memberEntry, 0, len(all))
	for _, u := range all {
		if guildMemberSet != nil {
			inMembers := guildMemberSet[u.ID]
			inBanned := guildBannedSet != nil && guildBannedSet[u.ID]
			if !inMembers && !inBanned {
				continue
			}
		}
		if opts.channelID != "" {
			if !permissions.HasPerm(channelPerms[u.ID], permissions.PermViewChannels) {
				continue
			}
		}
		dec := s.decryptFields(&u.User)
		if opts.search != "" {
			q := opts.search
			if !strings.Contains(strings.ToLower(dec.Username), q) && !strings.Contains(strings.ToLower(dec.DisplayName), q) {
				continue
			}
		}
		items = append(items, memberEntry{
			u: u, username: dec.Username, displayName: dec.DisplayName, bio: dec.Bio, online: onlineMap[u.ID],
		})
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].online != items[j].online {
			return items[i].online
		}
		return strings.ToLower(items[i].username) < strings.ToLower(items[j].username)
	})

	onlineCount := 0
	for _, d := range items {
		if d.online {
			onlineCount++
		}
	}

	page, total, _ := pagination.Slice(items, opts.offset, opts.limit)
	var roleMap map[string]UserRole
	if scopeGuildID != "" {
		roleMap = s.PreloadRoles()
	}
	var guildOverrides map[string]string
	if scopeGuildID != "" {
		pageIDs := make([]string, len(page))
		for i, d := range page {
			pageIDs[i] = d.u.ID
		}
		guildOverrides = s.db.GetGuildMemberNicknames(scopeGuildID, pageIDs)
	}
	_ = guildOverrides
	result := make([]echo.Map, len(page))
	for i, d := range page {
		// In guild scope, "banned" means guild-banned, not platform-banned.
		// Platform bans are a site-admin concern and don't belong in a
		// guild's member list.
		var banned bool
		if scopeGuildID != "" {
			banned = guildBannedSet != nil && guildBannedSet[d.u.ID]
		} else {
			banned = s.IsBanned != nil && s.IsBanned(d.u.ID)
		}
		avID := s.avatarFor(d.u.ID)
		bnID := s.bannerFor(d.u.ID)
		displayName := d.displayName
		bio := d.bio
		if scopeGuildID != "" {
			if nick, ok := guildOverrides[d.u.ID]; ok && nick != "" {
				displayName = nick
			}
		}
		roles := []UserRole{}
		roleColor := ""
		if scopeGuildID != "" {
			rolesStr := guildMemberRoles[d.u.ID]
			roles = ResolveRolesFromMap(rolesStr, roleMap)
			if len(roles) > 0 {
				roleColor = roles[0].Color
			}
		}
		entry := echo.Map{
			"id": d.u.ID, "username": d.username, "display_name": displayName, "roles": roles,
			"bio": bio,
			"avatar_id": avID, "banner_id": bnID, "created_at": d.u.CreatedAt.Format(dateFormat), "online": d.online,
			"presence_status": presence.ResolveStatus(s.db, d.u.ID, d.online),
			"banned": banned, "is_bot": d.u.IsBot,
		}
		if roleColor != "" {
			entry["role_color"] = roleColor
		}
		if guildJoinedAt != nil {
			if j, ok := guildJoinedAt[d.u.ID]; ok {
				entry["joined_at"] = j
			}
		}
		result[i] = entry
	}
	bannedCount := 0
	if opts.includeBanned {
		if scopeGuildID != "" {
			bannedCount = s.db.CountGuildBans(scopeGuildID)
		} else {
			bannedCount = s.db.CountBannedUsers()
		}
	}
	return result, total, onlineCount, bannedCount, nil
}

func (s *Service) buildMemberListCached(scopeGuildID string, opts memberListOpts) ([]echo.Map, int, int, int, error) {
	allSorted := s.getCachedGuildMembers(scopeGuildID)
	if allSorted == nil {
		return []echo.Map{}, 0, 0, 0, nil
	}

	onlineIDs := s.hub.OnlineUserIDs()
	onlineMap := make(map[string]bool, len(onlineIDs))
	for _, id := range onlineIDs {
		onlineMap[id] = true
	}

	var channelPerms map[string]int64
	if opts.channelID != "" {
		candidates := make([]string, 0, len(allSorted))
		for i := range allSorted {
			candidates = append(candidates, allSorted[i].id)
		}
		channelPerms = permissions.ResolveChannelPermsBatch(s.db, candidates, opts.channelID)
	}

	q := opts.search
	onlineFiltered := make([]int, 0, len(allSorted))
	offlineFiltered := make([]int, 0, len(allSorted))
	for i := range allSorted {
		e := &allSorted[i]
		if opts.channelID != "" {
			if !permissions.HasPerm(channelPerms[e.id], permissions.PermViewChannels) {
				continue
			}
		}
		if q != "" {
			if !strings.Contains(e.usernameLC, q) && !strings.Contains(strings.ToLower(e.displayName), q) {
				continue
			}
		}
		if onlineMap[e.id] {
			onlineFiltered = append(onlineFiltered, i)
		} else {
			offlineFiltered = append(offlineFiltered, i)
		}
	}

	total := len(onlineFiltered) + len(offlineFiltered)
	onlineCount := len(onlineFiltered)

	pageIndices := make([]int, 0, opts.limit)
	skip := opts.offset
	remain := opts.limit
	for _, idx := range onlineFiltered {
		if remain <= 0 {
			break
		}
		if skip > 0 {
			skip--
			continue
		}
		pageIndices = append(pageIndices, idx)
		remain--
	}
	for _, idx := range offlineFiltered {
		if remain <= 0 {
			break
		}
		if skip > 0 {
			skip--
			continue
		}
		pageIndices = append(pageIndices, idx)
		remain--
	}

	pageIDs := make([]string, len(pageIndices))
	for i, idx := range pageIndices {
		pageIDs[i] = allSorted[idx].id
	}
	guildOverrides := s.db.GetGuildMemberNicknames(scopeGuildID, pageIDs)
	roleMap := s.PreloadRoles()

	result := make([]echo.Map, len(pageIndices))
	for i, idx := range pageIndices {
		e := &allSorted[idx]
		online := onlineMap[e.id]
		displayName := e.displayName
		if nick, ok := guildOverrides[e.id]; ok && nick != "" {
			displayName = nick
		}
		roles := ResolveRolesFromMap(e.roles, roleMap)
		roleColor := ""
		if len(roles) > 0 {
			roleColor = roles[0].Color
		}
		entry := echo.Map{
			"id":              e.id,
			"username":        e.username,
			"display_name":    displayName,
			"roles":           roles,
			"bio":             e.bio,
			"avatar_id":       e.avatarID,
			"banner_id":       e.bannerID,
			"created_at":      e.createdAt.Format(dateFormat),
			"online":          online,
			"presence_status": presence.ResolveStatus(s.db, e.id, online),
			"banned":          false,
			"is_bot":          e.isBot,
		}
		if roleColor != "" {
			entry["role_color"] = roleColor
		}
		if e.joinedAt != "" {
			entry["joined_at"] = e.joinedAt
		}
		result[i] = entry
	}
	return result, total, onlineCount, 0, nil
}

func (s *Service) parsePagination(c echo.Context) (int, int, string) {
	limit := s.cfg.DefaultLimit
	offset := 0
	if v := c.QueryParam("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= s.cfg.MaxLimit {
			limit = n
		}
	}
	if v := c.QueryParam("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return limit, offset, strings.TrimSpace(strings.ToLower(c.QueryParam("search")))
}

func (s *Service) ListUsersHandler(c echo.Context) error {
	guildID := c.QueryParam("guild_id")
	if guildID == "" {
		return c.JSON(400, echo.Map{"error": "guild_id required"})
	}
	actorID := c.Get("userID").(string)
	if !s.db.IsGuildMember(guildID, actorID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	limit, offset, search := s.parsePagination(c)
	result, total, onlineCount, bannedCount, err := s.buildMemberList(memberListOpts{
		search: search, offset: offset, limit: limit,
		guildID: guildID,
		includeBanned: c.QueryParam("include_banned") == "1",
		actorID: actorID,
	})
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, echo.Map{"users": result, "total": total, "online_count": onlineCount, "banned_count": bannedCount})
}

// AddGuildMemberRole: PUT /api/guilds/:guildId/members/:userId/roles/:roleId
// Assigns a role to a guild member. The role must belong to the guild.
// RequirePerm(PermManageRoles) middleware gates access — owner bypasses.
// Hierarchy: non-owners cannot assign a role at or above their own top
// role — this blocks an Admin from e.g. granting Admin to someone else
// or to themselves, which would bypass their own rank.
func (s *Service) AddGuildMemberRole(c echo.Context) error {
	guildID := c.Param("guildId")
	targetID := c.Param("userId")
	roleID := c.Param("roleId")
	if guildID == "" || targetID == "" || roleID == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if s.db.GetRoleGuildID(roleID) != guildID {
		return c.JSON(400, echo.Map{"error": "role does not belong to this guild"})
	}
	if !s.db.IsGuildMember(guildID, targetID) {
		return c.JSON(404, echo.Map{"error": "user is not a member of this guild"})
	}
	actorID := c.Get("userID").(string)
	if !s.db.IsGuildOwner(guildID, actorID) {
		targetRolePos := s.db.GetRolePosition(roleID)
		actorPos := s.db.ActorGuildTopPosition(guildID, actorID)
		if targetRolePos <= actorPos {
			return c.JSON(403, echo.Map{"error": ErrRoleHierarchy.Error()})
		}
	}
	existing := s.db.GetGuildMemberRoles(guildID, targetID)
	ids := splitAndDedupe(existing, roleID, true)
	if err := s.db.UpdateGuildMemberRoles(guildID, targetID, ids); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidatePermCache(targetID)
	guilds.EmitMemberRoleUpdate(s.hub, guildID, targetID, ResolveRolesFromMap(ids, s.PreloadRoles()))
	return c.JSON(200, echo.Map{"ok": true})
}

// RemoveGuildMemberRole: DELETE /api/guilds/:guildId/members/:userId/roles/:roleId
// Hierarchy: non-owners cannot strip a role at or above their own top
// role. Prevents an Admin from yanking someone else's Admin role and
// effectively demoting a peer.
func (s *Service) RemoveGuildMemberRole(c echo.Context) error {
	guildID := c.Param("guildId")
	targetID := c.Param("userId")
	roleID := c.Param("roleId")
	if guildID == "" || targetID == "" || roleID == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	actorID := c.Get("userID").(string)
	if !s.db.IsGuildOwner(guildID, actorID) {
		targetRolePos := s.db.GetRolePosition(roleID)
		actorPos := s.db.ActorGuildTopPosition(guildID, actorID)
		if targetRolePos <= actorPos {
			return c.JSON(403, echo.Map{"error": ErrRoleHierarchy.Error()})
		}
	}
	existing := s.db.GetGuildMemberRoles(guildID, targetID)
	ids := splitAndDedupe(existing, roleID, false)
	if err := s.db.UpdateGuildMemberRoles(guildID, targetID, ids); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	permissions.InvalidatePermCache(targetID)
	guilds.EmitMemberRoleUpdate(s.hub, guildID, targetID, ResolveRolesFromMap(ids, s.PreloadRoles()))
	return c.JSON(200, echo.Map{"ok": true})
}

// splitAndDedupe parses a comma-separated role list, adds or removes a role,
// and returns the deduplicated result ready for UpdateGuildMemberRoles.
func splitAndDedupe(existing, roleID string, add bool) string {
	seen := map[string]bool{}
	var out []string
	for _, r := range strings.Split(existing, ",") {
		r = strings.TrimSpace(r)
		if r == "" || seen[r] {
			continue
		}
		if !add && r == roleID {
			continue
		}
		seen[r] = true
		out = append(out, r)
	}
	if add && !seen[roleID] {
		out = append(out, roleID)
	}
	return strings.Join(out, ",")
}

func (s *Service) broadcastAndRespond(c echo.Context, userID string) error {
	resp, err := s.BuildUserResponse(userID, userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitUserRoleUpdate(userID, resp)
	return c.JSON(200, resp)
}

func (s *Service) RefreshUser(userID string) {
	resp, err := s.BuildUserResponse(userID, userID)
	if err != nil {
		return
	}
	s.emitUserRoleUpdate(userID, resp)
}

func (s *Service) ListUserIDs() ([]string, error) {
	return s.db.ListUserIDs()
}