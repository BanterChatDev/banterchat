// =============================================================
// Centralized API route builder.
//
// Every frontend API call goes through one of the helpers in this
// file. Do NOT construct '/api/...' strings anywhere else in the
// codebase — it defeats the purpose of having a single versioned
// API boundary.
//
// How the file is organized:
//   V1         — the version prefix. One bump to /api/v2 here
//                migrates every route in the app.
//   r.<area>.* — endpoint functions that return a path string.
//                Pass into request(method, r.channels.get(id), ...).
//   u.*        — raw URL helpers for contexts that can't use the
//                request() wrapper: <img src=>, <a href=>, direct
//                fetch() (e.g. avatar downloads), new WebSocket(...).
//
// Naming rules:
//   list / get / create / update / delete / reorder — CRUD verbs
//   All path params are required — throw (implicitly via template
//   literal) if falsy. Validate above this layer.
// =============================================================

export const V1 = '/api/v1';
const BOT = `${V1}/bot`;  // reserved — bot-auth endpoints (browser app doesn't hit these, but kept parallel)

// -------------------------------------------------------------
// u — URL-string helpers for non-fetch contexts.
// -------------------------------------------------------------

export const u = {
  // WebSockets + static asset URLs used as <img src> / direct fetch().
  ws: () => `${V1}/ws`,
  csrf: () => `${V1}/csrf`,
  me: () => `${V1}/me`,

  avatar: (id) => `${V1}/avatars/${id}`,
  banner: (id) => `${V1}/banners/${id}`,
  guildAvatar: (id) => `${V1}/guild-avatars/${id}`,
  guildBanner: (id) => `${V1}/guild-banners/${id}`,
  webhookAvatar: (id) => `${V1}/webhook-avatars/${id}`,
  attachment: (id) => `${V1}/attachments/${id}`,
  attachmentView: (id) => `${V1}/attachments/${id}/view`,
  emoji: (id) => `${V1}/emojis/${id}`,
  // Proxy a remote URL through our image-rewriter (used by LinkEmbed
  // to avoid CSP + mixed-content issues on images from other origins).
  proxy: (url) => `${V1}/proxy?url=${encodeURIComponent(url)}`,

  // Server-rendered guest routes (live under /api/ but served off the
  // main host — kept here so all path strings are in one file even
  // when they're not called by the React app itself).
  bot: {
    gateway: () => `${BOT}/gateway`,
  },
};

// -------------------------------------------------------------
// r — endpoint path builders. Always return a string.
// -------------------------------------------------------------

export const r = {
  // Meta
  csrf: () => `${V1}/csrf`,
  permissions: () => `${V1}/permissions`,
  me: () => `${V1}/me`,

  // Auth
  auth: {
    register:      () => `${V1}/register`,
    login:         () => `${V1}/login`,
    logout:        () => `${V1}/logout`,
    forgot:        () => `${V1}/auth/forgot`,
    verifyKeyfile: () => `${V1}/auth/verify-keyfile`,
  },
  me_keyfile:      () => `${V1}/me/keyfile`,
  me_password:     () => `${V1}/me/password`,
  me_security_log: () => `${V1}/me/security-log`,
  me_prefs:        () => `${V1}/me/prefs`,
  accessibilityPrefs: () => `${V1}/me/accessibility-prefs`,
  me_avatar:   () => `${V1}/me/avatar`,
  me_banner:   () => `${V1}/me/banner`,
  me_status:        () => `${V1}/me/status`,

  sessions: {
    list:   () => `${V1}/sessions`,
    revoke: (id) => `${V1}/sessions/${id}`,
  },

  // Users
  users: {
    get:                 (id) => `${V1}/users/${id}`,
    list:                () => `${V1}/users`,
    terminate:           (id) => `${V1}/users/${id}/terminate`,
    listChannelMembers:  (channelId) => `${V1}/channels/${channelId}/members`,
    mutuals:             (id) => `${V1}/users/${id}/mutuals`,
  },
  terminations: () => `${V1}/terminations`,

  // Guilds / members / moderation / invites / icons
  sounds: {
    notification: () => `${V1}/me/sounds/notification`,
  },

  guilds: {
    list:         () => `${V1}/guilds`,
    create:       () => `${V1}/guilds`,
    get:          (id) => `${V1}/guilds/${id}`,
    update:       (id) => `${V1}/guilds/${id}`,
    delete:       (id) => `${V1}/guilds/${id}`,
    me:           (id) => `${V1}/guilds/${id}/me`,
    leave:        (id) => `${V1}/guilds/${id}/leave`,
    transferOwnership: (id) => `${V1}/guilds/${id}/transfer-ownership`,
    member:       (gid, uid) => `${V1}/guilds/${gid}/members/${uid}`,
    memberRole:   (gid, uid, rid) => `${V1}/guilds/${gid}/members/${uid}/roles/${rid}`,
    kick:         (gid, uid) => `${V1}/guilds/${gid}/members/${uid}/kick`,
    memberBan:    (gid, uid) => `${V1}/guilds/${gid}/members/${uid}/ban`,
    bans:         (id) => `${V1}/guilds/${id}/bans`,
    invites:      (id) => `${V1}/guilds/${id}/invites`,
    invite:       (id, code) => `${V1}/guilds/${id}/invites/${encodeURIComponent(code)}`,
    icon:         (id) => `${V1}/guilds/${id}/icon`,
    banner:       (id) => `${V1}/guilds/${id}/banner`,
    myProfile:    (id) => `${V1}/guilds/${id}/me/profile`,
    listing:      (id) => `${V1}/guilds/${id}/listing`,
    listingCheck: (id) => `${V1}/guilds/${id}/listing/slug-check`,
    commands:     (id) => `${V1}/guilds/${id}/commands`,
    vanity:       (id) => `${V1}/guilds/${id}/vanity`,
    webhooks:     (id) => `${V1}/guilds/${id}/webhooks`,
    auditLog:     (id) => `${V1}/guilds/${id}/audit-log`,
    emojis:       (id) => `${V1}/guilds/${id}/emojis`,
    emoji:        (gid, eid) => `${V1}/guilds/${gid}/emojis/${eid}`,
  },

  channelWebhooks: (channelId) => `${V1}/channels/${channelId}/webhooks`,
  webhook:         (id) => `${V1}/webhooks/${id}`,
  webhookRegen:    (id) => `${V1}/webhooks/${id}/regenerate-token`,

  notifPrefs:        () => `${V1}/me/notification-prefs`,
  notifPrefsGlobal:  () => `${V1}/me/notification-prefs/global`,
  notifPrefsGuild:   (guildId) => `${V1}/me/notification-prefs/guilds/${guildId}`,
  notifPrefsChannel: (channelId) => `${V1}/me/notification-prefs/channels/${channelId}`,
  notifPrefsReset:   (scopeType, scopeId) => `${V1}/me/notification-prefs/${scopeType}/${scopeId || 'global'}`,
  webhookAvatarUpload: (id) => `${V1}/webhooks/${id}/avatar`,

  invites: {
    preview: (code) => `${V1}/invites/${code}`,
    join:    (code) => `${V1}/invites/${code}/join`,
  },

  // Channels / categories / roles (CRUD + permission overrides)
  channels: {
    list:         (guildId) => `${V1}/guilds/${guildId}/channels`,
    create:       (guildId) => `${V1}/guilds/${guildId}/channels`,
    duplicate:    (id) => `${V1}/channels/${id}/duplicate`,
    reorder:      (guildId) => `${V1}/guilds/${guildId}/channels/reorder`,
    get:          (id) => `${V1}/channels/${id}`,
    update:       (id) => `${V1}/channels/${id}`,
    delete:       (id) => `${V1}/channels/${id}`,
    permissions:     (id) => `${V1}/channels/${id}/permissions`,
    myPermissions:   (id) => `${V1}/channels/${id}/permissions/me`,
    typing:          (id) => `${V1}/channels/${id}/typing`,
    messages:        (id) => `${V1}/channels/${id}/messages`,
    reactionMe: (cid, mid, emoji) =>
      `${V1}/channels/${cid}/messages/${mid}/reactions/${encodeURIComponent(emoji)}/@me`,
  },

  threads: {
    list:      (channelId) => `${V1}/channels/${channelId}/threads`,
    create:    (channelId) => `${V1}/channels/${channelId}/threads`,
    get:       (id) => `${V1}/threads/${id}`,
    archive:   (id) => `${V1}/threads/${id}/archive`,
    unarchive: (id) => `${V1}/threads/${id}/unarchive`,
    delete:    (id) => `${V1}/threads/${id}`,
  },

  messages: {
    update: (id) => `${V1}/messages/${id}`,
    delete: (id) => `${V1}/messages/${id}`,
  },

  categories: {
    list:    (guildId) => `${V1}/guilds/${guildId}/categories`,
    create:  (guildId) => `${V1}/guilds/${guildId}/categories`,
    reorder: (guildId) => `${V1}/guilds/${guildId}/categories/reorder`,
    update:  (id) => `${V1}/categories/${id}`,
    delete:  (id) => `${V1}/categories/${id}`,
    permissions: (id) => `${V1}/categories/${id}/permissions`,
  },

  roles: {
    list:   (guildId) => `${V1}/guilds/${guildId}/roles`,
    create: (guildId) => `${V1}/guilds/${guildId}/roles`,
    get:    (id) => `${V1}/roles/${id}`,
    update: (id) => `${V1}/roles/${id}`,
    delete: (id) => `${V1}/roles/${id}`,
  },

  // DMs, friends, blocks, reads, reactions emoji catalogue, reports
  dms: {
    list:        () => `${V1}/dms`,
    getOrCreate: (peerId) => `${V1}/dms/${peerId}`,
    close:       (peerId) => `${V1}/dms/${peerId}`,
    messages:    (peerId) => `${V1}/dms/${peerId}/messages`,
    members:     (peerId) => `${V1}/dms/${peerId}/members`,
  },

  friends: {
    list:     () => `${V1}/friends`,
    add:      () => `${V1}/friends`,
    one:      (id) => `${V1}/friends/${id}`,
  },

  blocks: {
    list:      () => `${V1}/blocks`,
    listBy:    () => `${V1}/blocked-by`,
    add:       () => `${V1}/blocks`,
    remove:    (username) => `${V1}/blocks/${encodeURIComponent(username)}`,
  },

  reads: {
    list:    () => `${V1}/reads`,
    mark:    (id) => `${V1}/reads/${id}`,
  },

  guildSettings: {
    get:            (id) => `${V1}/guilds/${id}/settings`,
    verification:   (id) => `${V1}/guilds/${id}/settings/verification`,
    mfa:            (id) => `${V1}/guilds/${id}/settings/mfa`,
    welcomeScreen:  (id) => `${V1}/guilds/${id}/settings/welcome-screen`,
    raidProtection: (id) => `${V1}/guilds/${id}/settings/raid-protection`,
    memberScreening: (id) => `${V1}/guilds/${id}/settings/member-screening`,
  },

  emojis: {
    default:       () => `${V1}/emojis/default`,
    categoryIcons: () => `${V1}/emojis/category-icons`,
    frequent:      () => `${V1}/emojis/frequent`,
  },

  reports: {
    create: () => `${V1}/reports`,
  },

  // Attachments, proxy, voice
  attachments: {
    upload: () => `${V1}/attachments`,
    probe:  () => `${V1}/attachments/probe`,
  },

  voice: {
    states: () => `${V1}/voice/states`,
    token:  () => `${V1}/voice/token`,
  },

  proxy: {
    linkMeta: () => `${V1}/link-meta`,
    oembed:   () => `${V1}/oembed`,
    fetch:    () => `${V1}/proxy`,
  },

  // Developer portal (session-authed, /applications/*)
  developers: {
    apps:       () => `${V1}/applications`,
    app:        (id) => `${V1}/applications/${id}`,
    appToken:   (id) => `${V1}/applications/${id}/token`,
    appAvatar:  (id) => `${V1}/applications/${id}/avatar`,
    appBanner:  (id) => `${V1}/applications/${id}/banner`,
    commands:   (id) => `${V1}/applications/${id}/commands`,
    oauth2: {
      appInfo:         () => `${V1}/oauth2/app_info`,
      manageableGuilds: () => `${V1}/oauth2/manageable_guilds`,
      authorize:       () => `${V1}/oauth2/authorize`,
    },
  },

  admin: {
    stats:       () => `${V1}/admin/stats`,
    users:       () => `${V1}/admin/users`,
    guilds:      () => `${V1}/admin/guilds`,
    guild:       (id) => `${V1}/admin/guilds/${id}`,
    bots:        () => `${V1}/admin/bots`,
    bot:         (id) => `${V1}/admin/bots/${id}`,
    terminate:   (id) => `${V1}/admin/guilds/${id}/terminate`,
    listings:    () => `${V1}/admin/listings`,
    listing:     (id) => `${V1}/admin/listings/${id}`,
    reports:     () => `${V1}/admin/reports`,
    resolve:     (id) => `${V1}/admin/reports/${id}/resolve`,

    suspendUser:    (id) => `${V1}/admin/users/${id}/suspend`,
    unsuspendUser:  (id) => `${V1}/admin/users/${id}/unsuspend`,
    deleteUser:     (id) => `${V1}/admin/users/${id}`,
    forceLogout:    (id) => `${V1}/admin/users/${id}/force-logout`,
    promoteUser:    (id) => `${V1}/admin/users/${id}/promote`,
    demoteUser:     (id) => `${V1}/admin/users/${id}/demote`,
    siteAdmins:     () => `${V1}/admin/site-admins`,

    suspendGuild:   (id) => `${V1}/admin/guilds/${id}/suspend`,
    unsuspendGuild: (id) => `${V1}/admin/guilds/${id}/unsuspend`,

    auditLog:       () => `${V1}/admin/audit-log`,
    auditLogExport: () => `${V1}/admin/audit-log/export`,
    guildAuditLog:  (id) => `${V1}/guilds/${id}/audit-log`,

    warn:               (id) => `${V1}/admin/users/${id}/warn`,
    userWarnings:       (id) => `${V1}/admin/users/${id}/warnings`,
    warningPresets:     () => `${V1}/admin/warnings/preset-reasons`,
    revokeWarning:      (id) => `${V1}/admin/warnings/${id}`,

    forceClearVanity:   (id) => `${V1}/admin/guilds/${id}/vanity`,
    reserveVanity:      () => `${V1}/admin/vanity/reserve`,
    listReservedVanity: () => `${V1}/admin/vanity/reserved`,
  },

  me_warnings:         () => `${V1}/me/warnings`,
  me_ack_warning:      (id) => `${V1}/me/warnings/${id}/acknowledge`,

  themes: {
    list: () => `${V1}/themes`,
  },

  gifs: {
    search:    () => `${V1}/gifs/search`,
    trending:  () => `${V1}/gifs/trending`,
    tabs:      () => `${V1}/me/gif-tabs`,
    tab:       (id) => `${V1}/me/gif-tabs/${id}`,
    favorites: () => `${V1}/me/gif-favorites`,
    favorite:  (id) => `${V1}/me/gif-favorites/${id}`,
  },
};