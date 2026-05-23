package websocket

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"ror/modules/conf"
	"ror/modules/logger"
	"ror/modules/ratelimit"
)

type RateLimiter interface {
	AllowWS(userID string) bool
	AllowWSPacket(userID, packetType string, rate float64, burst int) (bool, float64)
}

type inboundPacket struct {
	userID  string
	handler func(string, json.RawMessage)
	payload json.RawMessage
	done    <-chan struct{}
}

type channelViewerEntry struct {
	viewers []string
	builtAt time.Time
}

type Hub struct {
	mu                sync.RWMutex
	clients            map[string]map[*Client]struct{}
	cfg                Config
	rateLimits         ratelimit.Limits
	limiter            RateLimiter
	upgrader           websocket.Upgrader
	botUpgrader        websocket.Upgrader
	OnUserOnline        func(userID string)
	OnUserOffline       func(userID string)
	OnClientDisconnect  func(userID string)
	OnGuildMemberAdd    func(guildID, userID string)
	OnBotConnect       func(botUserID, sessionID string, sendFn func(data []byte))
	CanViewChannel     func(userID, channelID string) bool
	ChannelViewersBatch func(userIDs []string, channelID string) []string
	IsGuildMember      func(userID, guildID string) bool
	IsSiteAdminFn      func(userID string) bool
	ListRelatedUsers   func(userID string) []string
	GetChannelGuildID  func(channelID string) string
	GetGuildsForUser   func(userID string) interface{}
	IntentForEvent     func(eventType string) int64
	packetHandlers     map[string]func(userID string, raw json.RawMessage)
	inbound            chan inboundPacket
	offlineTimers      map[string]*time.Timer
	chanViewerMu       sync.RWMutex
	chanViewers        map[string]channelViewerEntry
	guildIndex         MembershipIndex
	botSessionsMu sync.Mutex
	botSessions   map[string]*botSession
	botResumeWin  time.Duration
}

type botSession struct {
	sessionID    string
	botUserID    string
	intents      int64
	client       *Client
	seq          int64
	replay       []bufferedEvent
	evictTimer   *time.Timer
}

type MembershipIndex interface {
	OnlineMembers(guildID string) []string
	Members(guildID string) []string
	IsMember(guildID, userID string) bool
	Counts(guildID string) (onlineCount, total int)
	GuildsForUser(userID string) []string
	RelatedUsers(userID string) []string
	AddMember(guildID, userID string)
	RemoveMember(guildID, userID string)
	MarkOnline(userID string) []string
	MarkOffline(userID string) []string
	Reconcile(now time.Time)
}

func (h *Hub) GuildIndex() MembershipIndex {
	return h.guildIndex
}

func (h *Hub) AttachMembershipIndex(idx MembershipIndex) {
	h.guildIndex = idx
	go h.runReconcile()
}

func (h *Hub) runReconcile() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		if h.guildIndex != nil {
			h.guildIndex.Reconcile(time.Now())
		}
	}
}

func (h *Hub) intentForEvent(eventType string) int64 {
	if h.IntentForEvent == nil {
		return 0
	}
	return h.IntentForEvent(eventType)
}

func NewHub(cfg Config, rateLimits ratelimit.Limits, limiter RateLimiter) *Hub {
	allowed := make(map[string]struct{}, len(conf.AllowedOrigins))
	for _, o := range conf.AllowedOrigins {
		allowed[o] = struct{}{}
	}
	strictOrigin := func(r *http.Request) bool {
		if len(allowed) == 0 {
			return true
		}
		origin := r.Header.Get("Origin")
		if origin == "" {
			return false
		}
		_, ok := allowed[origin]
		return ok
	}
	inboundQueue := cfg.InboundQueue
	if inboundQueue <= 0 {
		inboundQueue = 8192
	}
	h := &Hub{
		clients:        make(map[string]map[*Client]struct{}),
		cfg:            cfg,
		rateLimits:     rateLimits,
		limiter:        limiter,
		packetHandlers: make(map[string]func(userID string, raw json.RawMessage)),
		inbound:        make(chan inboundPacket, inboundQueue),
		offlineTimers:  make(map[string]*time.Timer),
		chanViewers:    make(map[string]channelViewerEntry),
		botSessions:    make(map[string]*botSession),
		botResumeWin:   90 * time.Second,
	}
	h.upgrader = newUpgrader(cfg, strictOrigin)
	h.botUpgrader = newUpgrader(cfg, func(r *http.Request) bool { return true })
	workers := cfg.InboundWorkers
	if workers <= 0 {
		workers = 32
	}
	for i := 0; i < workers; i++ {
		go h.processInbound()
	}
	return h
}

func newUpgrader(cfg Config, checkOrigin func(*http.Request) bool) websocket.Upgrader {
	rb := cfg.ReadBufferSize
	if rb <= 0 {
		rb = 4096
	}
	wb := cfg.WriteBufferSize
	if wb <= 0 {
		wb = 4096
	}
	return websocket.Upgrader{
		ReadBufferSize:  rb,
		WriteBufferSize: wb,
		CheckOrigin:     checkOrigin,
	}
}

func (h *Hub) processInbound() {
	for pkt := range h.inbound {
		if pkt.done != nil {
			select {
			case <-pkt.done:
				continue
			default:
			}
		}
		pkt.handler(pkt.userID, pkt.payload)
	}
}

func (h *Hub) HandlePacketType(pktType string, handler func(userID string, raw json.RawMessage)) {
	h.mu.Lock()
	h.packetHandlers[pktType] = handler
	h.mu.Unlock()
}

func (h *Hub) RoutePacket(userID string, data []byte, done <-chan struct{}) {
	var pkt struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	if json.Unmarshal(data, &pkt) != nil || pkt.Type == "" {
		return
	}
	if h.limiter != nil {
		rate, burst := h.wsPacketLimit(pkt.Type)
		if ok, retryAfter := h.limiter.AllowWSPacket(userID, pkt.Type, rate, burst); !ok {
			h.SendRateLimited(userID, peekMessageID(pkt.Payload), retryAfter)
			return
		}
	}
	h.mu.RLock()
	handler, ok := h.packetHandlers[pkt.Type]
	h.mu.RUnlock()
	if !ok {
		return
	}
	select {
	case h.inbound <- inboundPacket{userID: userID, handler: handler, payload: pkt.Payload, done: done}:
	default:
		logger.Warn("ws: inbound queue full, packet dropped", "user", userID, "type", pkt.Type)
	}
}

func peekMessageID(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var probe struct {
		MessageID string `json:"message_id"`
	}
	if json.Unmarshal(raw, &probe) != nil {
		return ""
	}
	return probe.MessageID
}

func (h *Hub) wsPacketLimit(pktType string) (float64, int) {
	switch pktType {
	case "message_send":
		return float64(h.rateLimits.WSMsg), h.rateLimits.WSMsgBurst
	case "message_edit":
		return float64(h.rateLimits.WSEdit), h.rateLimits.WSEditBurst
	case "message_delete":
		return float64(h.rateLimits.WSDelete), h.rateLimits.WSDeleteBurst
	case "typing_start", "typing_stop":
		return float64(h.rateLimits.WSTyping), h.rateLimits.WSTypingBurst
	case "slash_command":
		return float64(h.rateLimits.WSSlashCmd), h.rateLimits.WSSlashCmdBurst
	case "button_click":
		return 5, 3
	
	default:
		return float64(h.rateLimits.WSDefault), h.rateLimits.WSDefaultBurst
	}
}

func (h *Hub) closeClient(c *Client, code int, reason string) {
	msg := websocket.FormatCloseMessage(code, reason)
	select {
	case c.closeCh <- msg:
	default:
	}
	go h.Unregister(c)
}

func (h *Hub) Register(userID, sessionID string, isBot bool, intents int64, clientType string, conn *websocket.Conn) *Client {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*Client]struct{})
	}
	if len(h.clients[userID]) >= h.cfg.MaxConnections {
		return nil
	}
	graceful := false
	if timer, ok := h.offlineTimers[userID]; ok {
		timer.Stop()
		delete(h.offlineTimers, userID)
		graceful = true
	}
	first := len(h.clients[userID]) == 0
	sendBuf := h.cfg.ClientSendBuffer
	if sendBuf <= 0 {
		sendBuf = 8192
	}
	if clientType == "" {
		clientType = "web"
	}
	client := &Client{
		hub:        h,
		conn:       conn,
		userID:     userID,
		sessionID:  sessionID,
		isBot:      isBot,
		intents:    intents,
		clientType: clientType,
		send:       make(chan []byte, sendBuf),
		closeCh:    make(chan []byte, 1),
		done:       make(chan struct{}),
	}
	h.clients[userID][client] = struct{}{}
	if first && !graceful {
		idx := h.guildIndex
		uid := userID
		onUserOnline := h.OnUserOnline
		go func() {
			if idx != nil {
				idx.MarkOnline(uid)
			}
			if onUserOnline != nil {
				onUserOnline(uid)
			}
		}()
	}
	return client
}

func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.clients[client.userID]; ok {
		if _, exists := clients[client]; exists {
			delete(clients, client)
			client.signalDone()
			if client.isBot {
				h.detachBotSession(client)
			}
			if len(clients) == 0 {
				delete(h.clients, client.userID)
				if h.OnClientDisconnect != nil {
					uid := client.userID
					onDisconnect := h.OnClientDisconnect
					go onDisconnect(uid)
				}
				if h.OnUserOffline != nil {
					grace := h.cfg.OfflineGracePeriod
					if grace > 0 {
						uid := client.userID
						h.offlineTimers[uid] = time.AfterFunc(grace, func() {
						h.mu.Lock()
						_, pending := h.offlineTimers[uid]
						if pending {
							delete(h.offlineTimers, uid)
						}
						h.mu.Unlock()
						if pending {
							if h.guildIndex != nil {
								h.guildIndex.MarkOffline(uid)
							}
							h.OnUserOffline(uid)
						}
					})
					} else {
						uid := client.userID
						idx := h.guildIndex
						onUserOffline := h.OnUserOffline
						go func() {
							if idx != nil {
								idx.MarkOffline(uid)
							}
							if onUserOffline != nil {
								onUserOffline(uid)
							}
						}()
					}
				}
			}
		}
	}
}

func (h *Hub) IsOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if _, ok := h.offlineTimers[userID]; ok {
		return true
	}
	clients, ok := h.clients[userID]
	return ok && len(clients) > 0
}

func (h *Hub) DisconnectSession(sessionID string) {
	h.mu.RLock()
	var targets []*Client
	for _, clients := range h.clients {
		for client := range clients {
			if client.sessionID == sessionID {
				targets = append(targets, client)
			}
		}
	}
	h.mu.RUnlock()
	closeMsg := websocket.FormatCloseMessage(4002, "session revoked")
	for _, client := range targets {
		select {
		case client.closeCh <- closeMsg:
		default:
		}
	}
}

func (h *Hub) DisconnectUser(userID string) {
	h.mu.RLock()
	clients := h.clients[userID]
	targets := make([]*Client, 0, len(clients))
	for client := range clients {
		targets = append(targets, client)
	}
	h.mu.RUnlock()
	closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "logged out")
	for _, client := range targets {
		select {
		case client.closeCh <- closeMsg:
		default:
		}
	}
}

func (h *Hub) BanDisconnect(userID string) {
	h.mu.RLock()
	clients := h.clients[userID]
	targets := make([]*Client, 0, len(clients))
	for client := range clients {
		targets = append(targets, client)
	}
	h.mu.RUnlock()
	closeMsg := websocket.FormatCloseMessage(4001, "banned")
	for _, client := range targets {
		select {
		case client.closeCh <- closeMsg:
		default:
		}
	}
}

func (h *Hub) DisconnectBot(userID, reason string) {
	h.mu.RLock()
	clients := h.clients[userID]
	targets := make([]*Client, 0, len(clients))
	for client := range clients {
		targets = append(targets, client)
	}
	h.mu.RUnlock()
	if reason == "" {
		reason = "invalid token"
	}
	closeMsg := websocket.FormatCloseMessage(4004, reason)
	for _, client := range targets {
		select {
		case client.closeCh <- closeMsg:
		default:
		}
	}
}

// KickBotProtocolViolation closes the bot's gateway connection with
// code 4010 because the bot sent a malformed/invalid request the
// server can't safely process. Distinct from DisconnectBot (4004 =
// invalid token) so the client can surface the right diagnostic — a
// credential error vs a code bug in the bot are very different.
func (h *Hub) KickBotProtocolViolation(userID, reason string) {
	h.mu.RLock()
	clients := h.clients[userID]
	targets := make([]*Client, 0, len(clients))
	for client := range clients {
		targets = append(targets, client)
	}
	h.mu.RUnlock()
	if reason == "" {
		reason = "protocol violation"
	}
	closeMsg := websocket.FormatCloseMessage(CloseProtocolViolation, reason)
	for _, client := range targets {
		select {
		case client.closeCh <- closeMsg:
		default:
		}
	}
}

func (h *Hub) OnlineByClient() map[string]int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	counts := map[string]int{"web": 0, "desktop": 0}
	for _, conns := range h.clients {
		seenWeb := false
		seenDesktop := false
		for c := range conns {
			if c.isBot {
				continue
			}
			if c.clientType == "desktop" {
				seenDesktop = true
			} else {
				seenWeb = true
			}
		}
		if seenDesktop {
			counts["desktop"]++
		}
		if seenWeb {
			counts["web"]++
		}
	}
	return counts
}

func (h *Hub) OnlineUserIDs() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	ids := make([]string, 0, len(h.clients)+len(h.offlineTimers))
	seen := make(map[string]bool, len(h.clients))
	for uid, clients := range h.clients {
		if len(clients) > 0 {
			ids = append(ids, uid)
			seen[uid] = true
		}
	}
	for uid := range h.offlineTimers {
		if !seen[uid] {
			ids = append(ids, uid)
		}
	}
	return ids
}

// SetBotResumeWindow configures how long a bot session survives
// after its socket closes before becoming unresumable. Called from
// main.go wiring so the bots package's config drives the value
// without websocket importing bots.
func (h *Hub) SetBotResumeWindow(d time.Duration) {
	if d <= 0 {
		return
	}
	h.botSessionsMu.Lock()
	h.botResumeWin = d
	h.botSessionsMu.Unlock()
}

// registerBotSession records a fresh bot connection under the given
// session_id. Idempotent: if the id already exists (e.g. a RESUME
// is in progress) the existing entry is updated in place rather
// than replaced — this keeps the seq/replay state intact.
func (h *Hub) registerBotSession(sessionID, botUserID string, intents int64, client *Client) {
	if sessionID == "" {
		return
	}
	h.botSessionsMu.Lock()
	defer h.botSessionsMu.Unlock()
	entry, ok := h.botSessions[sessionID]
	if !ok {
		entry = &botSession{sessionID: sessionID, botUserID: botUserID, intents: intents}
		h.botSessions[sessionID] = entry
	}
	if entry.evictTimer != nil {
		entry.evictTimer.Stop()
		entry.evictTimer = nil
	}
	entry.client = client
	entry.botUserID = botUserID
	entry.intents = intents
}

// detachBotSession is called when a bot client disconnects. It
// snapshots the live client's seq + replay state onto the session
// entry and arms an eviction timer for the configured resume
// window. If RESUME doesn't land before the timer fires, the
// session is purged.
func (h *Hub) detachBotSession(client *Client) {
	if client == nil || client.sessionID == "" || !client.isBot {
		return
	}
	h.botSessionsMu.Lock()
	defer h.botSessionsMu.Unlock()
	entry, ok := h.botSessions[client.sessionID]
	if !ok {
		return
	}
	// Snapshot the seq state under the client's own lock so we get
	// a consistent view; the replay slice is copied to keep entry
	// ownership independent of the dying client.
	client.seqMu.Lock()
	entry.seq = client.seq
	entry.replay = append([]bufferedEvent(nil), client.replayBuf...)
	client.seqMu.Unlock()
	entry.client = nil
	sessionID := client.sessionID
	win := h.botResumeWin
	entry.evictTimer = time.AfterFunc(win, func() {
		h.botSessionsMu.Lock()
		cur, ok := h.botSessions[sessionID]
		// Only evict if the entry is still detached. If a RESUME
		// landed during the window, cur.client != nil and we leave
		// it alone.
		if ok && cur == entry && cur.client == nil {
			delete(h.botSessions, sessionID)
		}
		h.botSessionsMu.Unlock()
	})
}

func (h *Hub) lookupBotSession(sessionID, botUserID string, fromSeq int64) (*botSession, bool) {
	if sessionID == "" {
		return nil, false
	}
	h.botSessionsMu.Lock()
	defer h.botSessionsMu.Unlock()
	entry, ok := h.botSessions[sessionID]
	if !ok {
		return nil, false
	}
	if entry.botUserID != botUserID {
		// session_id belongs to a different bot — refuse to resume
		// (token rotation or session theft).
		return nil, false
	}
	if len(entry.replay) > 0 {
		oldest := entry.replay[0].seq
		if fromSeq+1 < oldest {
			return nil, false
		}
	} else if fromSeq != entry.seq {
		// No replay buffer (e.g. nothing dispatched since connect)
		// and the requested seq doesn't match where we are.
		return nil, false
	}
	return entry, true
}