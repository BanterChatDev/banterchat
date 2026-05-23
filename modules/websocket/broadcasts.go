package websocket

import "time"

func (h *Hub) Emit(eventType string, payload interface{}) {
	h.Broadcast(Message{Type: eventType, Payload: payload})
}

func (h *Hub) EmitTo(userID, eventType string, payload interface{}) {
	h.Send(userID, Message{Type: eventType, Payload: payload})
}

func (h *Hub) EmitToChannel(channelID, eventType string, payload interface{}) {
	if h.CanViewChannel == nil {
		h.Emit(eventType, payload)
		return
	}
	h.emitToUserSet(eventType, payload, h.channelViewers(channelID))
}

func (h *Hub) emitToUserSet(eventType string, payload interface{}, userIDs []string) {
	if len(userIDs) == 0 {
		return
	}
	msg := Message{Type: eventType, Payload: payload}
	humanData, payloadData, ok := h.marshalParts(msg)
	if !ok {
		return
	}
	intent := h.intentForEvent(msg.Type)
	h.mu.RLock()
	clients := make([]*Client, 0, len(userIDs))
	for _, uid := range userIDs {
		for c := range h.clients[uid] {
			clients = append(clients, c)
		}
	}
	h.mu.RUnlock()
	for _, c := range clients {
		h.deliver(c, humanData, msg.Type, payloadData, intent)
	}
}

func (h *Hub) channelViewers(channelID string) []string {
	const ttl = 5 * time.Second
	now := time.Now()
	h.chanViewerMu.RLock()
	if entry, ok := h.chanViewers[channelID]; ok && now.Sub(entry.builtAt) < ttl {
		viewers := entry.viewers
		h.chanViewerMu.RUnlock()
		return viewers
	}
	h.chanViewerMu.RUnlock()
	candidates := h.viewerCandidates(channelID)
	viewers := h.filterViewers(candidates, channelID)
	h.chanViewerMu.Lock()
	h.chanViewers[channelID] = channelViewerEntry{viewers: viewers, builtAt: now}
	h.chanViewerMu.Unlock()
	return viewers
}

func (h *Hub) viewerCandidates(channelID string) []string {
	if h.GetChannelGuildID != nil && h.guildIndex != nil {
		if guildID := h.GetChannelGuildID(channelID); guildID != "" {
			return h.guildIndex.OnlineMembers(guildID)
		}
	}
	h.mu.RLock()
	out := make([]string, 0, len(h.clients))
	for uid := range h.clients {
		out = append(out, uid)
	}
	h.mu.RUnlock()
	return out
}

func (h *Hub) filterViewers(candidates []string, channelID string) []string {
	if h.ChannelViewersBatch != nil {
		return h.ChannelViewersBatch(candidates, channelID)
	}
	out := make([]string, 0, len(candidates))
	for _, uid := range candidates {
		if h.CanViewChannel(uid, channelID) {
			out = append(out, uid)
		}
	}
	return out
}

func (h *Hub) EmitToGuild(guildID, eventType string, payload interface{}) {
	if guildID == "" {
		h.Emit(eventType, payload)
		return
	}
	if h.guildIndex == nil {
		return
	}
	h.emitToUserSet(eventType, payload, h.guildIndex.OnlineMembers(guildID))
}

// EmitToRelatedUsers sends an event to every user who has a membership
// relationship with `targetUserID` (currently: shares at least one guild),
// plus the target themselves. Scope-gates per-user events (profile
// updates, online/offline, role changes, ban broadcasts) so strangers on
// the platform don't receive privacy-leaking pings.
func (h *Hub) EmitToRelatedUsers(targetUserID, eventType string, payload interface{}) {
	if h.ListRelatedUsers == nil {
		h.Emit(eventType, payload)
		return
	}
	related := h.ListRelatedUsers(targetUserID)
	if len(related) == 0 {
		h.EmitTo(targetUserID, eventType, payload)
		return
	}
	allowed := make(map[string]bool, len(related)+1)
	for _, id := range related {
		allowed[id] = true
	}
	allowed[targetUserID] = true
	h.BroadcastFiltered(Message{Type: eventType, Payload: payload}, func(uid string) bool {
		return allowed[uid]
	})
}

// EmitToSiteAdmins broadcasts to every connected user whose account is in
// the site-admin list. Used for admin-panel live updates (reports, stats
// deltas, new registrations, bans). Silently no-ops if IsSiteAdminFn
// hasn't been wired yet.
func (h *Hub) EmitToSiteAdmins(eventType string, payload interface{}) {
	if h.IsSiteAdminFn == nil {
		return
	}
	h.BroadcastFiltered(Message{Type: eventType, Payload: payload}, h.IsSiteAdminFn)
}

// EmitBotCommandsUpdated tells everyone in a guild to refresh the slash-
// command list for the given bot. Fired when a bot joins, leaves, is
// kicked or banned, or pushes a new command set. Lives in the websocket
// package (not bots) so guilds/oauth2/etc. can call it without pulling
// the bots package into their import graph — bots transitively imports
// auth → users → guilds, so any guilds → bots edge creates a cycle.
func (h *Hub) EmitBotCommandsUpdated(guildID, botUserID string) {
	if h == nil {
		return
	}
	h.EmitToGuild(guildID, "bot_commands_updated", map[string]string{
		"guild_id":    guildID,
		"bot_user_id": botUserID,
	})
}