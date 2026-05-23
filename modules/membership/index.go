package membership

import (
	"sync"
	"time"
)

type guildEntry struct {
	members map[string]struct{}
	online  map[string]struct{}
	loaded  bool
}

type Index struct {
	mu               sync.RWMutex
	guilds           map[string]*guildEntry
	userGuilds       map[string]map[string]struct{}
	loadGuildMembers func(guildID string) []string
	loadUserGuilds   func(userID string) []string
	isUserOnline     func(userID string) bool
}

func NewIndex(loadGuildMembers func(string) []string, loadUserGuilds func(string) []string, isUserOnline func(string) bool) *Index {
	return &Index{
		guilds:           make(map[string]*guildEntry),
		userGuilds:       make(map[string]map[string]struct{}),
		loadGuildMembers: loadGuildMembers,
		loadUserGuilds:   loadUserGuilds,
		isUserOnline:     isUserOnline,
	}
}

func (idx *Index) ensureGuild(guildID string) *guildEntry {
	idx.mu.RLock()
	g, ok := idx.guilds[guildID]
	idx.mu.RUnlock()
	if ok && g.loaded {
		return g
	}
	if idx.loadGuildMembers == nil {
		idx.mu.Lock()
		if g, ok := idx.guilds[guildID]; ok {
			idx.mu.Unlock()
			return g
		}
		g = &guildEntry{members: make(map[string]struct{}), online: make(map[string]struct{}), loaded: true}
		idx.guilds[guildID] = g
		idx.mu.Unlock()
		return g
	}
	memberIDs := idx.loadGuildMembers(guildID)
	idx.mu.Lock()
	defer idx.mu.Unlock()
	g, ok = idx.guilds[guildID]
	if !ok {
		g = &guildEntry{members: make(map[string]struct{}), online: make(map[string]struct{})}
		idx.guilds[guildID] = g
	}
	if !g.loaded {
		for _, uid := range memberIDs {
			g.members[uid] = struct{}{}
			if idx.isUserOnline != nil && idx.isUserOnline(uid) {
				g.online[uid] = struct{}{}
			}
		}
		g.loaded = true
	}
	return g
}

func (idx *Index) ensureUserGuilds(userID string) map[string]struct{} {
	idx.mu.RLock()
	gs, ok := idx.userGuilds[userID]
	idx.mu.RUnlock()
	if ok {
		return gs
	}
	if idx.loadUserGuilds == nil {
		idx.mu.Lock()
		if gs, ok := idx.userGuilds[userID]; ok {
			idx.mu.Unlock()
			return gs
		}
		gs = make(map[string]struct{})
		idx.userGuilds[userID] = gs
		idx.mu.Unlock()
		return gs
	}
	guildIDs := idx.loadUserGuilds(userID)
	idx.mu.Lock()
	defer idx.mu.Unlock()
	gs, ok = idx.userGuilds[userID]
	if !ok {
		gs = make(map[string]struct{}, len(guildIDs))
		for _, gid := range guildIDs {
			gs[gid] = struct{}{}
		}
		idx.userGuilds[userID] = gs
	}
	return gs
}

func (idx *Index) MarkOnline(userID string) []string {
	gs := idx.ensureUserGuilds(userID)
	guildIDs := make([]string, 0, len(gs))
	idx.mu.RLock()
	for gid := range gs {
		guildIDs = append(guildIDs, gid)
	}
	idx.mu.RUnlock()
	for _, gid := range guildIDs {
		idx.ensureGuild(gid)
	}
	idx.mu.Lock()
	for _, gid := range guildIDs {
		if g, ok := idx.guilds[gid]; ok {
			g.online[userID] = struct{}{}
		}
	}
	idx.mu.Unlock()
	return guildIDs
}

func (idx *Index) MarkOffline(userID string) []string {
	idx.mu.RLock()
	gs := idx.userGuilds[userID]
	guildIDs := make([]string, 0, len(gs))
	for gid := range gs {
		guildIDs = append(guildIDs, gid)
	}
	idx.mu.RUnlock()
	idx.mu.Lock()
	for _, gid := range guildIDs {
		if g, ok := idx.guilds[gid]; ok {
			delete(g.online, userID)
		}
	}
	idx.mu.Unlock()
	return guildIDs
}

func (idx *Index) AddMember(guildID, userID string) {
	idx.ensureGuild(guildID)
	online := idx.isUserOnline != nil && idx.isUserOnline(userID)
	idx.mu.Lock()
	defer idx.mu.Unlock()
	if g, ok := idx.guilds[guildID]; ok {
		g.members[userID] = struct{}{}
		if online {
			g.online[userID] = struct{}{}
		}
	}
	gs, ok := idx.userGuilds[userID]
	if !ok {
		gs = make(map[string]struct{})
		idx.userGuilds[userID] = gs
	}
	gs[guildID] = struct{}{}
}

func (idx *Index) RemoveMember(guildID, userID string) {
	idx.mu.Lock()
	defer idx.mu.Unlock()
	if g, ok := idx.guilds[guildID]; ok {
		delete(g.members, userID)
		delete(g.online, userID)
	}
	if gs, ok := idx.userGuilds[userID]; ok {
		delete(gs, guildID)
		if len(gs) == 0 {
			delete(idx.userGuilds, userID)
		}
	}
}

func (idx *Index) Counts(guildID string) (onlineCount, total int) {
	idx.ensureGuild(guildID)
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	g, ok := idx.guilds[guildID]
	if !ok {
		return 0, 0
	}
	return len(g.online), len(g.members)
}

func (idx *Index) IsMember(guildID, userID string) bool {
	idx.ensureGuild(guildID)
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	g, ok := idx.guilds[guildID]
	if !ok {
		return false
	}
	_, in := g.members[userID]
	return in
}

func (idx *Index) Members(guildID string) []string {
	idx.ensureGuild(guildID)
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	g, ok := idx.guilds[guildID]
	if !ok {
		return nil
	}
	out := make([]string, 0, len(g.members))
	for uid := range g.members {
		out = append(out, uid)
	}
	return out
}

func (idx *Index) OnlineMembers(guildID string) []string {
	idx.ensureGuild(guildID)
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	g, ok := idx.guilds[guildID]
	if !ok {
		return nil
	}
	out := make([]string, 0, len(g.online))
	for uid := range g.online {
		out = append(out, uid)
	}
	return out
}

func (idx *Index) GuildsForUser(userID string) []string {
	gs := idx.ensureUserGuilds(userID)
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	out := make([]string, 0, len(gs))
	for gid := range gs {
		out = append(out, gid)
	}
	return out
}

func (idx *Index) RelatedUsers(userID string) []string {
	idx.ensureUserGuilds(userID)
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	gs := idx.userGuilds[userID]
	if len(gs) == 0 {
		return nil
	}
	seen := make(map[string]struct{})
	for gid := range gs {
		g, ok := idx.guilds[gid]
		if !ok {
			continue
		}
		for uid := range g.members {
			if uid != userID {
				seen[uid] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(seen))
	for uid := range seen {
		out = append(out, uid)
	}
	return out
}

func (idx *Index) Reconcile(now time.Time) {
	idx.mu.RLock()
	guildIDs := make([]string, 0, len(idx.guilds))
	for gid, g := range idx.guilds {
		if g.loaded {
			guildIDs = append(guildIDs, gid)
		}
	}
	idx.mu.RUnlock()
	if idx.loadGuildMembers == nil {
		return
	}
	freshMembers := make(map[string]map[string]struct{}, len(guildIDs))
	freshOnline := make(map[string]map[string]struct{}, len(guildIDs))
	freshUserGuilds := make(map[string]map[string]struct{})
	for _, gid := range guildIDs {
		fresh := idx.loadGuildMembers(gid)
		members := make(map[string]struct{}, len(fresh))
		online := make(map[string]struct{})
		for _, uid := range fresh {
			members[uid] = struct{}{}
			if idx.isUserOnline != nil && idx.isUserOnline(uid) {
				online[uid] = struct{}{}
			}
			gs, ok := freshUserGuilds[uid]
			if !ok {
				gs = make(map[string]struct{})
				freshUserGuilds[uid] = gs
			}
			gs[gid] = struct{}{}
		}
		freshMembers[gid] = members
		freshOnline[gid] = online
	}
	idx.mu.Lock()
	defer idx.mu.Unlock()
	for gid, members := range freshMembers {
		g, ok := idx.guilds[gid]
		if !ok {
			continue
		}
		g.members = members
		g.online = freshOnline[gid]
	}
	for uid, gs := range freshUserGuilds {
		idx.userGuilds[uid] = gs
	}
	for uid, gs := range idx.userGuilds {
		if _, hasFresh := freshUserGuilds[uid]; hasFresh {
			continue
		}
		for gid := range gs {
			if _, stillReconciled := freshMembers[gid]; stillReconciled {
				delete(gs, gid)
			}
		}
		if len(gs) == 0 {
			delete(idx.userGuilds, uid)
		}
	}
}