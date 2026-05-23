package main

import (
	"context"
	"encoding/json"
	"html/template"
	"path/filepath"
	"ror/modules/db"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"

	"ror/modules/admin"
	"ror/modules/apperr"
	"ror/modules/attachments"
	"ror/modules/auditlog"
	"ror/modules/auth"
	"ror/modules/avatar"
	"ror/modules/banner"
	"ror/modules/bots"
	"ror/modules/categories"
	"ror/modules/channels"
	"ror/modules/conf"
	"ror/modules/csrf"
	"ror/modules/discovery"
	"ror/modules/dms"
	"ror/modules/embed"
	"ror/modules/emojis"
	"ror/modules/friends"
	"ror/modules/gifs"
	"ror/modules/guilds"
	"ror/modules/interactions"
	"ror/modules/invites"	
	"ror/modules/keyfile"
	"ror/modules/logger"
	"ror/modules/membership"
	"ror/modules/messages"
	"ror/modules/oauth2"
	"ror/modules/permissions"
	"ror/modules/proxy"
	"ror/modules/ratelimit"
	"ror/modules/reactions"
	"ror/modules/reads"
	"ror/modules/reports"
	"ror/modules/roles"
	"ror/modules/router"
	"ror/modules/presence"
	"ror/modules/sitemoderation"
	"ror/modules/threads"
	"ror/modules/typing"
	"ror/modules/prefs/accessibilityprefs"
	"ror/modules/prefs/notifprefs"
	"ror/modules/prefs/uiprefs"
	"ror/modules/users"
	"ror/modules/voicechat"
	"ror/modules/warnings"
	"ror/modules/webhooks"
	"ror/modules/websocket"
)

func main() {
	os.Setenv("TZ", "UTC")

	dbConn, err := db.Open(db.BuildDSN())
	if err != nil {
		logger.Error("db open failed", "error", err)
		panic(err)
	}
	defer dbConn.Close()	

	e := echo.New()
	e.HideBanner = true

	e.Use(middleware.Recover())
	e.Use(logger.Middleware())
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if c.Request().ContentLength > attachments.DefaultConfig().MaxSize+(1<<20) {
				return c.JSON(413, echo.Map{"error": apperr.ErrFileTooLarge.Error()})
			}
			// Version-agnostic: any /api/* request (current /api/v1/* or
			// future /api/v2/*) gets no-cache headers. Keep this
			// checking the bare "/api/" prefix so adding a new version
			// doesn't require updating the middleware.
			if strings.HasPrefix(c.Request().URL.Path, "/api/") {
				c.Response().Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
				c.Response().Header().Set("Pragma", "no-cache")
			}
			return next(c)
		}
	})

	// apiPrefix is the versioned public API root. All user-facing REST
	// routes register under apiPrefixGroup (no trailing slash, for the
	// router's prefix+path concatenation) and are matched with the
	// trailing slash variant for rate-limiting / cache-headers / etc.
	//
	// apiBotPrefix is the dedicated bot namespace. Bot routes are
	// ALWAYS separate from user routes: they have their own handler
	// funcs (in modules/bots/) and their own middleware stack (bot
	// token auth + bot rate-limit buckets). Shared service layer
	// underneath; shared routing pipeline never.
	apiPrefix := conf.APIPrefix()
	apiPrefixGroup := apiPrefix
	pathLogin := apiPrefix + "/login"
	pathReg := apiPrefix + "/register"
	pathWS := apiPrefix + "/ws"
	pathChanAPI := apiPrefix + "/channels/"
	pathCSRF := apiPrefix + "/csrf"

	// APIPrefix governs the global "any /api/* request counts toward
	// reads-bucket" fallback. Kept as bare "/api/" so any future
	// /api/v2/* picks up the default rate limit automatically; the
	// per-route rules below are version-specific via the pathXXX
	// constants and only match the active version's paths.
	rlim := ratelimit.DefaultLimits()
	rl := ratelimit.New(ratelimit.Config{
		Enabled:     rlim.Enabled,
		APIPrefix:   "/api/",
		SkipPaths:   []string{pathCSRF},
		GlobalRate:  rlim.GlobalRate,
		GlobalBurst: rlim.GlobalBurst,
		Rules: []ratelimit.RuleConfig{
			{Method: "POST", PathPrefix: pathLogin, Rate: float64(rlim.Auth), Burst: rlim.AuthBurst, Period: time.Minute},
			{Method: "POST", PathPrefix: pathReg, Rate: float64(rlim.Auth), Burst: rlim.AuthBurst, Period: time.Minute},
			{Method: "GET", PathPrefix: pathWS, Rate: float64(rlim.WS), Burst: rlim.WSBurst, Period: 10 * time.Second},
			{Method: "POST", PathPrefix: pathChanAPI, Rate: float64(rlim.MsgSend), Burst: rlim.MsgSendBurst, Period: time.Minute},
			{Method: "GET", PathPrefix: apiPrefix, Rate: float64(rlim.Reads), Burst: rlim.ReadsBurst, Period: time.Minute},
			{PathPrefix: apiPrefix, Rate: float64(rlim.Writes), Burst: rlim.WritesBurst, Period: time.Minute},
		},
		CleanupPeriod: 5 * time.Minute,
	})
	if rlim.Enabled {
		e.Use(rl.Middleware())
	}

	wsHub := websocket.NewHub(websocket.DefaultConfig(), ratelimit.DefaultLimits(), rl)
	csrfSvc := csrf.NewService(conf.Secure)
	auditSvc := auditlog.NewService(dbConn)
	usersSvc := users.NewService(dbConn, users.DefaultConfig(), conf.MasterKey, conf.SiteAdmins, conf.UsernameBlacklist, auth.DefaultConfig().MinUsername, auth.DefaultConfig().MaxUsername, wsHub)
	dbConn.OnGuildMembershipChange = users.InvalidateMemberListCache
	uiprefsSvc := uiprefs.NewService(dbConn, wsHub, conf.MasterKey)
	accessibilityprefsSvc := accessibilityprefs.NewService(dbConn, wsHub)
	usersSvc.SetPrefs(uiprefsSvc)
	auditSvc.HydrateUser = func(userID string) map[string]any {
		resp, err := usersSvc.BuildUserResponse(userID, userID)
		if err != nil {
			return nil
		}
		return map[string]any{
			"id":            resp["id"],
			"username":      resp["username"],
			"discriminator": resp["discriminator"],
			"display_name":  resp["display_name"],
			"avatar_id":     resp["avatar_id"],
			"is_bot":        resp["is_bot"],
		}
	}
	presenceSvc := presence.NewService(dbConn, wsHub)
	keyfileSvc := keyfile.NewService(keyfile.DefaultConfig(), wsHub)
	authSvc := auth.NewService(dbConn, auth.DefaultConfig(), conf.Domain, conf.Secure, conf.UsernameBlacklist, ratelimit.DefaultLimits().Enabled, wsHub, usersSvc, keyfileSvc, auditSvc)
	channelsSvc := channels.NewService(dbConn, wsHub, channels.DefaultConfig(), conf.MasterKey, auditSvc)
	categoriesSvc := categories.NewService(dbConn, wsHub, auditSvc)
	attachmentPageTemplate := template.Must(template.ParseFiles(filepath.Join("assets", "public", "attachment.html")))
	attSvc := attachments.NewService(dbConn, attachments.DefaultConfig(), conf.MasterKey, attachmentPageTemplate)
	usersSvc.DeleteAttachment = attSvc.DeleteByID
	uiprefsSvc.DeleteAttachment = attSvc.DeleteByID
	invitePageTemplate := template.Must(template.ParseFiles(filepath.Join("assets", "public", "invite.html")))
	botInvitePageTemplate := template.Must(template.ParseFiles(filepath.Join("assets", "public", "botinvite.html")))
	discoveryListingTemplate := template.Must(template.ParseFiles(filepath.Join("assets", "public", "discovery", "listing.html")))
	avatarSvc := avatar.NewService(dbConn, avatar.DefaultConfig(), conf.MasterKey, wsHub)
	avatarSvc.UpdateUserAvatar = usersSvc.UpdateAvatar
	usersSvc.GetAvatarID = avatarSvc.GetByUserID

	bannerSvc := banner.NewService(dbConn, banner.DefaultConfig(), conf.MasterKey, wsHub)
	usersSvc.GetBannerID = bannerSvc.GetByUserID
	usersSvc.GetBannerCrop = bannerSvc.GetCropByUserID
	msgSvc := messages.NewService(dbConn, wsHub, messages.DefaultConfig(), embed.DefaultConfig(), attachments.DefaultConfig(), conf.MasterKey, usersSvc)
	msgSvc.GetAvatarByUserID = avatarSvc.GetByUserID
	presenceSvc.BuildUser = func(userID string) map[string]interface{} {
		username, displayName := usersSvc.DecryptIdentity(userID)
		userRow, _ := usersSvc.GetUserByID(userID)
		isBot := false
		if userRow != nil {
			isBot = userRow.IsBot
		}
		avatarID := ""
		if avatarSvc != nil {
			avatarID = avatarSvc.GetByUserID(userID)
		}
		return map[string]interface{}{
			"id":           userID,
			"username":     username,
			"display_name": displayName,
			"avatar_id":    avatarID,
			"is_bot":       isBot,
		}
	}
	msgSvc.GetFlairByUserID = func(uid string) string { return dbConn.GetUserFlair(uid) }
	msgSvc.GetAttachments = func(messageID string) []messages.MsgAttachment {
		raw := attSvc.GetByMessage(messageID)
		out := make([]messages.MsgAttachment, len(raw))
		for i, a := range raw {
			out[i] = messages.MsgAttachment{ID: a.ID, Filename: a.Filename, MimeType: a.MimeType, Size: a.Size, Width: a.Width, Height: a.Height, FilePreview: a.FilePreview, Flags: a.Flags, DurationSecs: a.DurationSecs, Waveform: a.Waveform}
		}
		return out
	}
	msgSvc.GetAttachmentsBatch = func(messageIDs []string) map[string][]messages.MsgAttachment {
		raw := attSvc.GetByMessages(messageIDs)
		result := make(map[string][]messages.MsgAttachment, len(raw))
		for msgID, atts := range raw {
			out := make([]messages.MsgAttachment, len(atts))
			for i, a := range atts {
				out[i] = messages.MsgAttachment{ID: a.ID, Filename: a.Filename, MimeType: a.MimeType, Size: a.Size, Width: a.Width, Height: a.Height, FilePreview: a.FilePreview, Flags: a.Flags, DurationSecs: a.DurationSecs, Waveform: a.Waveform}
			}
			result[msgID] = out
		}
		return result
	}
	msgSvc.LinkAttachment = attSvc.LinkToMessage
	msgSvc.DeleteAttachments = attSvc.DeleteByMessage
	channelsSvc.DeleteChannelAttachments = attSvc.DeleteByChannel
	channelsSvc.DeleteChannelMessages = msgSvc.DeleteByChannel
	modSvc := sitemoderation.NewService(dbConn, wsHub, usersSvc)
	modSvc.GetAvatarID = avatarSvc.GetByUserID
	modSvc.BuildUserResponse = usersSvc.BuildUserResponse
	readsSvc := reads.NewService(dbConn, wsHub)
	notifprefsSvc := notifprefs.NewService(dbConn, wsHub)
	readsSvc.SetNotif(notifprefsSvc)
	msgSvc.OnNotify = readsSvc.OnMessage
	authSvc.IsBanned = modSvc.IsBanned
	authSvc.IsIPBanned = modSvc.IsIPBanned
	usersSvc.IsBanned = modSvc.IsBanned
	rolesSvc := roles.NewService(dbConn, wsHub, roles.DefaultConfig(), conf.MasterKey, auditSvc)

	typingSvc := typing.NewService(wsHub, usersSvc, dbConn)
	proxySvc := proxy.NewService(proxy.DefaultConfig())

	dmSvc := dms.NewService(dbConn, wsHub, dms.DefaultConfig(), messages.DefaultConfig(), usersSvc)
	friendsSvc := friends.NewService(dbConn, wsHub, conf.MasterKey)
	friendsSvc.DecryptUsernameByID = usersSvc.DecryptUsernameByID
	friendsSvc.GetAvatarByUserID = avatarSvc.GetByUserID
	friendsSvc.GetFlairByUserID = func(uid string) string { return dbConn.GetUserFlair(uid) }
	discoverySvc := discovery.NewService(dbConn, conf.Domain, authSvc)
	discoverySvc.SetTemplates(&discovery.Templates{Listing: discoveryListingTemplate})
	gifsSvc := gifs.NewService(dbConn, gifs.DefaultConfig(), wsHub)
	if err := discoverySvc.BackfillGuildNames(); err != nil {
		logger.Error("discovery backfill failed", "error", err)
	}
	dmSvc.GetAvatarByUserID = avatarSvc.GetByUserID
	dmSvc.FetchMessages = msgSvc.ListForDM
	permissions.ResolveDMPerms = dmSvc.ResolveDMPerms
	msgSvc.GetDMParticipants = dmSvc.GetParticipants
	msgSvc.CanSendDM = dmSvc.CanSendDM
	readsSvc.GetDMParticipants = dmSvc.GetParticipants
	msgSvc.StripDMMentions = dms.StripInvalidMentions
	msgSvc.ReopenDM = dmSvc.ReopenForUser
	msgSvc.CheckIsBot = dbConn.IsBot
	msgSvc.CheckSlowmode = func(channelID, userID string, effectivePerms int64) (bool, int) {
		if permissions.HasPerm(effectivePerms, permissions.PermManageMessages) || permissions.HasPerm(effectivePerms, permissions.PermManageChannels) {
			return true, 0
		}
		seconds := dbConn.GetChannelSlowmode(channelID)
		return channelsSvc.Slowmode().Check(channelID, userID, seconds)
	}

	dmFilter := func(userIDs []string, channelID string) []string {
		out := make([]string, 0, 2)
		for _, uid := range userIDs {
			if dmSvc.IsParticipant(uid, channelID) {
				out = append(out, uid)
			}
		}
		return out
	}
	guildFilter := func(userIDs []string, channelID string) []string {
		permsMap := permissions.ResolveChannelPermsBatch(dbConn, userIDs, channelID)
		out := make([]string, 0, len(permsMap))
		for uid, p := range permsMap {
			if permissions.HasPerm(p, permissions.PermViewChannels) {
				out = append(out, uid)
			}
		}
		return out
	}
	wsHub.CanViewChannel = func(userID, channelID string) bool {
		if dmSvc.IsDMChannel(channelID) {
			return dmSvc.IsParticipant(userID, channelID)
		}
		return len(guildFilter([]string{userID}, channelID)) > 0
	}
	wsHub.ChannelViewersBatch = func(userIDs []string, channelID string) []string {
		if len(userIDs) == 0 {
			return nil
		}
		if dmSvc.IsDMChannel(channelID) {
			return dmFilter(userIDs, channelID)
		}
		return guildFilter(userIDs, channelID)
	}
	wsHub.GetChannelGuildID = dbConn.GetChannelGuildID
	wsHub.IsGuildMember = func(userID, guildID string) bool {
		if idx := wsHub.GuildIndex(); idx != nil {
			return idx.IsMember(guildID, userID)
		}
		return dbConn.IsGuildMember(guildID, userID)
	}
	wsHub.ListRelatedUsers = func(userID string) []string {
		if idx := wsHub.GuildIndex(); idx != nil {
			return idx.RelatedUsers(userID)
		}
		return nil
	}
	wsHub.IsSiteAdminFn = func(userID string) bool {
		return usersSvc.IsSiteAdmin(userID)
	}
	membershipIdx := membership.NewIndex(
		func(guildID string) []string {
			rows, err := dbConn.ListGuildMembers(guildID)
			if err != nil {
				return nil
			}
			out := make([]string, len(rows))
			for i, r := range rows {
				out[i] = r.UserID
			}
			return out
		},
		func(userID string) []string {
			ids, err := dbConn.ListGuildIDsForUser(userID)
			if err != nil {
				return nil
			}
			return ids
		},
		wsHub.IsOnline,
	)
	wsHub.AttachMembershipIndex(membershipIdx)

	reactionSvc := reactions.NewService(dbConn, wsHub, reactions.DefaultConfig())
	reactionSvc.DecryptUsername = usersSvc.DecryptUsernameByID
	msgSvc.DeleteReactions = reactionSvc.DeleteByMessage
	msgSvc.GetReactionsBatch = reactionSvc.GetReactionsBatch
	voiceSvc := voicechat.NewService(dbConn, wsHub)
	voiceSvc.DecryptUsernameByID = usersSvc.DecryptUsernameByID

	// --- Bots ---
	botsSvc := bots.NewService(dbConn, bots.DefaultConfig(), auth.DefaultConfig(), conf.MasterKey, conf.UsernameBlacklist, usersSvc, wsHub)
	botsSvc.GetAvatarID = avatarSvc.GetByUserID
	botsSvc.GetBannerID = bannerSvc.GetByUserID
	modSvc.InvalidateBotToken = botsSvc.InvalidateTokenByBotUserID
	botsSvc.ApplyUserProfile = func(targetUserID string, patch bots.ProfilePatch) (map[string]interface{}, int, error) {
		resp, status, err := usersSvc.ApplyProfileFields(targetUserID, users.ProfileFieldsPatch{
			DisplayName: patch.DisplayName,
			Bio:         patch.Bio,
		})
		return resp, status, err
	}
	// botMw is the sole bot-auth entry point. Routes that opt into
	// it via RouteConfig.Bot=true get 401 for anything other than a
	// valid bot token — no session fallback, ever.
	botMw := botsSvc.RequireBot()
	e.Use(botsSvc.APIMiddleware(rl))

	wsHub.IntentForEvent = bots.EventIntent
	// OnBotConnect fires once per bot gateway connect, right after
	// HELLO is sent. We build the READY payload here — identity, the
	// bot's guilds, and a fresh session_id so the SDK can log/correlate
	// the connection across reconnect cycles.
	//
	// session_id is per-connection, not per-token: reconnecting with
	// the same token gets a new one. Used for debugging today; reserved
	// for future RESUME semantics (Discord gateway op 6) when we build
	// that.
	wsHub.OnBotConnect = func(botUserID, sessionID string, sendFn func([]byte)) {
		appID := ""
		if row, err := dbConn.GetBotAppByBotUserID(botUserID); err == nil && row != nil {
			appID = row.ID
		}
		ready := map[string]interface{}{
			"user": map[string]interface{}{
				"id":       botUserID,
				"username": usersSvc.DecryptUsernameByID(botUserID),
				"bot":      true,
			},
			"guilds":         wsHub.GetGuildsForUser(botUserID),
			"application_id": appID,
			"session_id":     sessionID,
			"v":              1,
		}
		data, err := json.Marshal(map[string]interface{}{"type": "ready", "payload": ready})
		if err != nil {
			return
		}
		sendFn(data)
	}
	wsHub.SetBotResumeWindow(time.Duration(bots.DefaultConfig().GatewayResumeWinS) * time.Second)

	wsHub.HandlePacketType("message_send", msgSvc.HandleSend)
	wsHub.HandlePacketType("message_edit", msgSvc.HandleEdit)
	wsHub.HandlePacketType("message_delete", msgSvc.HandleDelete)
	wsHub.HandlePacketType("reaction_add", reactionSvc.HandleAdd)
	wsHub.HandlePacketType("reaction_remove", reactionSvc.HandleRemove)
	// --- Interactions (slash-command invocations) ---
	invokerLookup := func(userID, channelID string) interactions.InvokerInfo {
		info := msgSvc.InvokerInfoFor(userID, channelID)
		return interactions.InvokerInfo{ID: info.ID, Username: info.Username, AvatarID: info.AvatarID, RoleColor: info.RoleColor}
	}
	interactionsSvc := interactions.NewService(dbConn, wsHub, msgSvc, invokerLookup)
	interactionsAPI := interactions.NewAPI(interactionsSvc)
	wsHub.HandlePacketType("slash_command", interactionsAPI.HandleSlashCommand)
	wsHub.HandlePacketType("button_click", interactionsAPI.HandleButtonClick)
	// Background sweep: flip stale interactions to 'expired' once a
	// minute. Runs for the lifetime of the process; no shutdown wire
	// needed since the goroutine holds no external resources.
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if _, err := dbConn.ExpireStaleInteractions(time.Now()); err != nil {
				logger.Warn("interactions expiry sweep failed", "error", err)
			}
		}
	}()

	guildSvc := guilds.NewService(dbConn, wsHub, guilds.DefaultConfig(), roles.DefaultConfig(), conf.MasterKey)
	guildSvc.IsSiteAdminFn = usersSvc.IsSiteAdmin
	guildSvc.DecryptUsernameFn = usersSvc.DecryptUsernameByID
	guildSvc.CountOnlineInGuild = presenceSvc.CountOnlineInGuild
	guildSvc.VerifyUserPasswordFn = usersSvc.VerifyPassword
	guildSvc.DeleteUserGuildMessagesFn = msgSvc.DeleteUserGuildMessages
	avatarSvc.CanManageGuild = guildSvc.CanManageGuild
	avatarSvc.EmitGuildUpdate = guildSvc.EmitGuildUpdate
	bannerSvc.CanManageGuild = guildSvc.CanManageGuild
	bannerSvc.EmitGuildUpdate = guildSvc.EmitGuildUpdate
	guildSvc.RecordAuditFn = func(actorID, guildID, targetType, targetID, action, reason string, metadata map[string]any) {
		auditSvc.RecordGuild(actorID, guildID, targetType, targetID, action, reason, metadata)
	}
	threadsSvc := threads.NewService(dbConn, wsHub, channels.DefaultConfig(), conf.MasterKey, auditSvc)
	warningsSvc := warnings.NewService(dbConn, usersSvc, wsHub, auditSvc)
	webhooksSvc := webhooks.NewService(dbConn, wsHub, auditSvc, webhooks.DefaultConfig(), attachments.DefaultConfig(), conf.MasterKey, conf.APIPrefix())
	webhooksSvc.OnSendMessage = msgSvc.SendAsWebhook
	webhooksSvc.OnStoreAttachment = attSvc.StoreFromWebhook
	botAPI := bots.NewAPI(botsSvc, msgSvc, reactionSvc, typingSvc, avatarSvc, bannerSvc, webhooksSvc)
	webhookAvatarSvc := webhooks.NewAvatarService(dbConn, avatar.DefaultConfig().User, conf.MasterKey, auditSvc)
	authSvc.IsSuspended = dbConn.IsSuspendedByID
	adminSvc := admin.NewService(dbConn, usersSvc, guildSvc, wsHub, auditSvc, botsSvc)
	adminSvc.CountOnlineInGuild = presenceSvc.CountOnlineInGuild
	reportsSvc := reports.NewService(dbConn, wsHub, usersSvc, auditSvc)
	reportsSvc.DeleteMessageByID = msgSvc.DeleteMessageByID
	reportsSvc.SnapshotMessage = func(messageID string) (content, authorID, authorUsername, authorAvatar, channelID, createdAt string, ok bool) {
		m, err := msgSvc.GetMessage(messageID)
		if err != nil || m == nil {
			return "" , "", "", "", "", "", false
		}
		return m.Content, m.UserID, m.Username, m.AvatarID, m.ChannelID, m.CreatedAt, true
	}
	reportsSvc.SnapshotGuild = func(guildID string) (name, iconID, ownerID, ownerUsername string, memberCount int, ok bool) {
		row, err := dbConn.GetGuild(guildID)
		if err != nil || row == nil {
			return "", "", "", "", 0, false
		}
		g := guildSvc.DecryptGuild(row)
		return g.Name, g.Icon, g.OwnerID, usersSvc.DecryptUsernameByID(g.OwnerID), dbConn.CountGuildMembers(guildID), true
	}
	reportsSvc.SnapshotUser = func(userID string) (username, avatarID, bio string, ok bool) {
		u, err := usersSvc.GetUserByID(userID)
		if err != nil || u == nil {
			return "", "", "", false
		}
		avID := ""
		if usersSvc.GetAvatarID != nil {
			avID = usersSvc.GetAvatarID(userID)
		}
		return usersSvc.DecryptUsername(u), avID, usersSvc.DecryptBio(u), true
	}
	// Hub callback for guilds.EmitListUpdate: returns the user's current,
	// decrypted guild list shaped exactly like GET /api/guilds. Wired here
	// because websocket can't import guilds (cycle).
	wsHub.GetGuildsForUser = func(userID string) interface{} {
		rows, err := dbConn.ListGuildsForUser(userID)
		if err != nil {
			return []guilds.Guild{}
		}
		out := make([]guilds.Guild, len(rows))
		for i := range rows {
			out[i] = guildSvc.DecryptGuild(&rows[i])
		}
		return out
	}

	invitesSvc := invites.NewService(dbConn, wsHub, invites.DefaultConfig(), authSvc, auditSvc)
	invitesSvc.SetInvitePageTemplate(invitePageTemplate)
	invitesSvc.Bootstrap()
	invitesSvc.CanManageGuild = guildSvc.CanManageGuild
	invitesSvc.DecryptGuild = func(row *db.GuildRow) invites.GuildInfo {
		g := guildSvc.DecryptGuild(row)
		return invites.GuildInfo{
			ID: g.ID, Name: g.Name, Icon: g.Icon, Banner: g.Banner,
			BannerCrop: g.BannerCrop, Description: g.Description,
			OwnerID: g.OwnerID, MemberCount: g.MemberCount, OnlineCount: g.OnlineCount,
			CreatedAt: g.CreatedAt,
		}
	}
	guilds.OnMemberJoin = func(guildID, userID string) {
		wcID := dbConn.GetGuildWelcomeChannelID(guildID)
		if wcID == "" {
			return
		}
		msgSvc.SendSystemMessage(wcID, "user_join", map[string]interface{}{"user_id": userID})
	}

	emojisSvc := emojis.NewService(dbConn, emojis.DefaultConfig(), conf.MasterKey, wsHub)
	emojisSvc.CanManageGuild = func(userID, guildID string) bool {
		row, err := dbConn.GetGuild(guildID)
		if err != nil {
			return false
		}
		return guildSvc.CanManageGuild(userID, row)
	}
	emojisSvc.SeedDefaults()

	buildMember := func(guildID, userID string) map[string]interface{} {
		mem, err := dbConn.GetGuildMember(guildID, userID)
		if err != nil || mem == nil {
			return nil
		}
		username, displayName := usersSvc.DecryptIdentity(userID)
		userRow, _ := usersSvc.GetUserByID(userID)
		isBot := false
		if userRow != nil {
			isBot = userRow.IsBot
		}
		avatarID := ""
		if msgSvc.GetAvatarByUserID != nil {
			avatarID = msgSvc.GetAvatarByUserID(userID)
		}
		online := wsHub.IsOnline(userID)
		roles := users.ResolveRolesFromMap(mem.Roles, usersSvc.PreloadRoles())
		roleColor := ""
		for _, r := range roles {
			if r.Color != "" {
				roleColor = r.Color
				break
			}
		}
		entry := map[string]interface{}{
			"id":           userID,
			"username":     username,
			"display_name": displayName,
			"avatar_id":    avatarID,
			"is_bot":       isBot,
			"online":       online,
			"nickname":     mem.Nickname,
			"joined_at":    mem.JoinedAt.Format("2006-01-02"),
			"roles":        roles,
		}
		if roleColor != "" {
			entry["role_color"] = roleColor
		}
		return entry
	}
	invitesSvc.BuildMember = buildMember
	presenceSvc.BuildGuildMember = buildMember

	oauth2Svc := oauth2.NewService(dbConn, wsHub)
	oauth2Svc.LookupAppPublic = func(appID string) (*oauth2.PublicApp, error) {
		app, err := botsSvc.GetAppPublic(appID)
		if err != nil {
			return nil, err
		}
		avatarID := ""
		if getAvatarByUserID := msgSvc.GetAvatarByUserID; getAvatarByUserID != nil {
			avatarID = getAvatarByUserID(app.BotUserID)
		}
		return &oauth2.PublicApp{
			ID:            app.ID,
			Name:          app.Name,
			Discriminator: app.Discriminator,
			DisplayTag:    app.DisplayTag,
			Description:   app.Description,
			AvatarID:      avatarID,
			BotUserID:     app.BotUserID,
		}, nil
	}
	oauth2Svc.CanManageGuild = guildSvc.CanManageGuild
	oauth2Svc.DecryptGuildName = func(row *db.GuildRow) string {
		return guildSvc.DecryptGuild(row).Name
	}
	oauth2Svc.SessionUserID = authSvc.SessionUserID
	oauth2Svc.BuildMember = buildMember
	oauth2Svc.CreateBotRole = func(guildID, botName, botUserID string, perms int64) (string, error) {
		role, err := rolesSvc.CreateBotRoleInGuild(guildID, botName, botUserID, perms)
		if err != nil {
			return "", err
		}
		return role.ID, nil
	}
	oauth2Svc.SetBotInvitePageTemplate(botInvitePageTemplate)

	r := router.New(e, apiPrefix, csrfSvc.Middleware, authSvc.RequireAuth, botMw, authSvc.RequireSiteAdmin, authSvc.RequirePerm)

	r.Static("/css", "assets/public/css")
	r.Static("/js", "assets/public/js")
	r.Static("/media", "assets/media")
	r.Static("/downloads", "assets/downloads")
	
	r.Register(router.RouteConfig{Method: "GET", Path: apiPrefix + "permissions", Handler: func(c echo.Context) error {
		return c.JSON(200, echo.Map{"all": permissions.GetAll(), "channel": permissions.GetChannelLevel()})
	}})

	r.RegisterGroup(apiPrefixGroup, false, false, []router.RouteConfig{	

	})

	r.RegisterModule(adminSvc)
	r.RegisterModule(attSvc)
	r.RegisterModule(authSvc)
	r.RegisterModule(auditSvc)
	r.RegisterModule(avatarSvc)
	r.RegisterModule(bannerSvc)
	r.RegisterModule(botAPI)
	r.RegisterModule(categoriesSvc)
	r.RegisterModule(channelsSvc)
	r.RegisterModule(csrfSvc)
	r.RegisterModule(discoverySvc)
	r.RegisterModule(dmSvc)
	r.RegisterModule(emojisSvc)
	r.RegisterModule(friendsSvc)
	r.RegisterModule(gifsSvc)
	r.RegisterModule(guildSvc)
	r.RegisterModule(invitesSvc)
	r.RegisterModule(msgSvc)
	r.RegisterModule(modSvc)
	r.RegisterModule(oauth2Svc)
	r.RegisterModule(presenceSvc)
	r.RegisterModule(proxySvc)
	r.RegisterModule(readsSvc)
	r.RegisterModule(reportsSvc)
	r.RegisterModule(rolesSvc)
	r.RegisterModule(threadsSvc)
	r.RegisterModule(typingSvc)
	r.RegisterModule(accessibilityprefsSvc)
	r.RegisterModule(notifprefsSvc)
	r.RegisterModule(uiprefsSvc)
	r.RegisterModule(usersSvc)
	r.RegisterModule(voiceSvc)
	r.RegisterModule(warningsSvc)
	r.RegisterModule(webhooksSvc)
	r.RegisterModule(webhookAvatarSvc)
	r.RegisterModule(wsHub)
	r.RegisterBotModule(botAPI)
	r.RegisterBotModule(channelsSvc)
	r.RegisterBotModule(categoriesSvc)
	r.RegisterBotModule(guildSvc)
	r.RegisterBotModule(rolesSvc)
	r.RegisterBotModule(usersSvc)
	r.RegisterBotModule(msgSvc)
	r.RegisterBotModule(attSvc)
	r.RegisterBotModule(typingSvc)
	r.RegisterBotModule(emojisSvc)
	r.RegisterBotModule(interactionsAPI)
	r.RegisterBotModule(wsHub)
	
	e.GET("/invite/:code", invitesSvc.InvitePage)
	e.GET("/api/v1/webhooks/:id/:token", webhooksSvc.Get)
	e.POST("/api/v1/webhooks/:id/:token", webhooksSvc.Execute)

	discoverySvc.RegisterPublic(e)

	e.GET("/api/v1/config", func(c echo.Context) error {
		return c.JSON(200, echo.Map{
			"max_file_size":      attachments.DefaultConfig().MaxSize,
			"max_file_count":     attachments.DefaultConfig().MaxFileCount,
			"max_message_length": messages.DefaultConfig().MaxLength,
			"discovery_url":      conf.DiscoveryURL,
			"terms_url":          conf.TermsURL,
		})
	})
	e.GET("/oauth2/authorize", oauth2Svc.BotInvitePage)
	registerSPARoutes(e)

	logger.Info("server starting", "addr", conf.HTTPAddr, "domain", conf.Domain)
	go func() {
		if err := e.Start(conf.HTTPAddr); err != nil {
			logger.Info("server shutting down")
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	logger.Info("graceful shutdown initiated")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	e.Shutdown(ctx)
	dbConn.Close()
	logger.Info("shutdown complete")
}

func registerSPARoutes(e *echo.Echo) {
	// Mirror of SPA_PATHS in assets/src/js/routes.js — keep these in sync.
	// Anything the SPA's App.jsx routing block handles must appear here so a
	// fresh reload or shared link returns the SPA shell instead of 404.
	//
	// Server-rendered URLs (registered elsewhere, NOT here):
	//   /invite/:code     → invitesSvc.InvitePage  (registered above)
	//   /oauth2/authorize → oauth2Svc.BotInvitePage (registered above)
	//   /appeal, /info    → standalone HTMLs       (registered below)
	spaRoutes := []string{
		"/",
		"/login",
		"/register",
		"/forgot-password",
		"/channels",
		"/channels/:id",
		"/channels/:guildId/:channelId",
		"/messages",
		"/messages/:userId/:peerId",
		"/admin",
		"/admin/:tab",
		"/developers/applications",
		"/downloads",
		"/tos",
		"/terms",
		"/privacy",
		"/guidelines",
		"/content-policy",
	}
	for _, route := range spaRoutes {
		e.GET(route, spaHandler)
	}
	// Standalone HTML pages (NOT served by the SPA).
	// Appeal has its own form. Info is a static landing.
	e.GET("/appeal", func(c echo.Context) error { return c.File("assets/public/appeal.html") })
	e.GET("/info", func(c echo.Context) error { return c.File("assets/public/info.html") })
	e.RouteNotFound("/*", notFoundHandler)
}

func spaHandler(c echo.Context) error {
	return c.File("assets/public/index.html")
}

func notFoundHandler(c echo.Context) error {
	return apperr.NotFound(c)
}