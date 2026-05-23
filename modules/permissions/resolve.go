package permissions

import (
	"ror/modules/db"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	permCache    sync.Map
	permCacheTTL = 5 * time.Second
)

type cachedPerm struct {
	perms     int64
	expiresAt time.Time
}

func permCacheKey(userID, guildID, channelID string) string {
	return userID + ":" + guildID + ":" + channelID
}

func InvalidatePermCache(userID string) {
	permCache.Range(func(key, _ any) bool {
		if k, ok := key.(string); ok && strings.HasPrefix(k, userID+":") {
			permCache.Delete(key)
		}
		return true
	})
}

func InvalidateAllPermCache() {
	permCache.Range(func(key, _ any) bool {
		permCache.Delete(key)
		return true
	})
}

func HasPerm(userPerms, required int64) bool {
	if userPerms&PermAdministrator != 0 {
		return true
	}
	return userPerms&required != 0
}

type rolePerms struct {
	id       string
	allow    int64
	deny     int64
	position int
}

func splitRoleIDs(rolesStr string) []string {
	if rolesStr == "" {
		return nil
	}
	parts := strings.Split(rolesStr, ",")
	out := make([]string, 0, len(parts))
	for _, id := range parts {
		id = strings.TrimSpace(id)
		if id != "" {
			out = append(out, id)
		}
	}
	return out
}

func foldRolePerms(rps []rolePerms) int64 {
	sort.Slice(rps, func(i, j int) bool { return rps[i].position < rps[j].position })
	var result, decided int64
	for _, rp := range rps {
		newAllow := rp.allow & ^decided
		newDeny := rp.deny & ^decided
		result |= newAllow
		result &= ^newDeny
		decided |= newAllow | newDeny
	}
	return result
}

func resolveFromRoleIDs(database *db.DB, ids []string) int64 {
	if len(ids) == 0 {
		return 0
	}
	rows, err := database.GetRolePermsBatch(ids)
	if err != nil {
		return 0
	}
	defer rows.Close()
	rpMap := make(map[string]rolePerms)
	for rows.Next() {
		var rp rolePerms
		rows.Scan(&rp.id, &rp.allow, &rp.deny, &rp.position)
		rpMap[rp.id] = rp
	}
	rps := make([]rolePerms, 0, len(ids))
	for _, id := range ids {
		if rp, ok := rpMap[id]; ok {
			rps = append(rps, rp)
		}
	}
	return foldRolePerms(rps)
}

func GetUserGuildPerms(database *db.DB, userID, guildID string) int64 {
	rolesStr := database.GetGuildMemberRoles(guildID, userID)
	if rolesStr == "" && guildID != "" {
		rolesStr = database.GetGuildDefaultRoleID(guildID)
	}
	return resolveFromRoleIDs(database, splitRoleIDs(rolesStr))
}

var ResolveDMPerms func(userID, channelID string) (int64, bool)

func IsDM(userID, channelID string) bool {
	if ResolveDMPerms == nil {
		return false
	}
	_, isDM := ResolveDMPerms(userID, channelID)
	return isDM
}

func ResolveChannelPerms(database *db.DB, userID, channelID string) int64 {
	return ResolveChannelPermsBatch(database, []string{userID}, channelID)[userID]
}

func ResolveChannelPermsBatch(database *db.DB, userIDs []string, channelID string) map[string]int64 {
	out := make(map[string]int64, len(userIDs))
	if len(userIDs) == 0 {
		return out
	}
	if ResolveDMPerms != nil {
		if _, isDM := ResolveDMPerms(userIDs[0], channelID); isDM {
			for _, uid := range userIDs {
				perms, _ := ResolveDMPerms(uid, channelID)
				out[uid] = perms
			}
			return out
		}
	}
	if parent := database.GetChannelParentID(channelID); parent != "" {
		channelID = parent
	}
	guildID := database.GetChannelGuildID(channelID)
	if guildID == "" {
		return out
	}
	now := time.Now()
	expiry := now.Add(permCacheTTL)
	missing := make([]string, 0, len(userIDs))
	for _, uid := range userIDs {
		key := permCacheKey(uid, guildID, channelID)
		if cached, ok := permCache.Load(key); ok {
			if cp, ok := cached.(cachedPerm); ok && now.Before(cp.expiresAt) {
				out[uid] = cp.perms
				continue
			}
		}
		missing = append(missing, uid)
	}
	if len(missing) == 0 {
		return out
	}
	memberRoles := database.GetGuildMembersRolesBatch(guildID, missing)
	allRoleIDs := make(map[string]struct{})
	for _, rolesStr := range memberRoles {
		for _, rid := range splitRoleIDs(rolesStr) {
			allRoleIDs[rid] = struct{}{}
		}
	}
	defaultRoleID := database.GetGuildDefaultRoleID(guildID)
	if defaultRoleID != "" {
		allRoleIDs[defaultRoleID] = struct{}{}
	}
	rolePermMap := make(map[string]rolePerms)
	if len(allRoleIDs) > 0 {
		ids := make([]string, 0, len(allRoleIDs))
		for id := range allRoleIDs {
			ids = append(ids, id)
		}
		rows, err := database.GetRolePermsBatch(ids)
		if err == nil {
			for rows.Next() {
				var rp rolePerms
				rows.Scan(&rp.id, &rp.allow, &rp.deny, &rp.position)
				rolePermMap[rp.id] = rp
			}
			rows.Close()
		}
	}
	channelOverrides := database.GetChannelPermOverridesAllRoles(channelID)
	categoryID := database.GetChannelCategoryID(channelID)
	var categoryOverrides map[string]db.RoleOverride
	if categoryID != "" {
		categoryOverrides = database.GetCategoryPermOverridesAllRoles(categoryID)
	}
	for _, uid := range missing {
		rolesStr, hasMember := memberRoles[uid]
		if !hasMember {
			out[uid] = 0
			permCache.Store(permCacheKey(uid, guildID, channelID), cachedPerm{perms: 0, expiresAt: expiry})
			continue
		}
		roleIDs := splitRoleIDs(rolesStr)
		if len(roleIDs) == 0 && defaultRoleID != "" {
			roleIDs = []string{defaultRoleID}
		}
		if len(roleIDs) == 0 {
			out[uid] = 0
			permCache.Store(permCacheKey(uid, guildID, channelID), cachedPerm{perms: 0, expiresAt: expiry})
			continue
		}
		rps := make([]rolePerms, 0, len(roleIDs))
		for _, id := range roleIDs {
			if rp, ok := rolePermMap[id]; ok {
				rps = append(rps, rp)
			}
		}
		guildPerms := foldRolePerms(rps)
		if guildPerms&PermAdministrator != 0 {
			out[uid] = guildPerms
			permCache.Store(permCacheKey(uid, guildID, channelID), cachedPerm{perms: guildPerms, expiresAt: expiry})
			continue
		}
		var chAllow, chDeny int64
		for _, rid := range roleIDs {
			if ov, ok := channelOverrides[rid]; ok {
				chAllow |= ov.Allow
				chDeny |= ov.Deny
			}
		}
		if chAllow != 0 || chDeny != 0 {
			result := (guildPerms & ^chDeny) | chAllow
			out[uid] = result
			permCache.Store(permCacheKey(uid, guildID, channelID), cachedPerm{perms: result, expiresAt: expiry})
			continue
		}
		if categoryOverrides != nil {
			var catAllow, catDeny int64
			for _, rid := range roleIDs {
				if ov, ok := categoryOverrides[rid]; ok {
					catAllow |= ov.Allow
					catDeny |= ov.Deny
				}
			}
			if catAllow != 0 || catDeny != 0 {
				result := (guildPerms & ^catDeny) | catAllow
				out[uid] = result
				permCache.Store(permCacheKey(uid, guildID, channelID), cachedPerm{perms: result, expiresAt: expiry})
				continue
			}
		}
		out[uid] = guildPerms
		permCache.Store(permCacheKey(uid, guildID, channelID), cachedPerm{perms: guildPerms, expiresAt: expiry})
	}
	return out
}