DROP TABLE IF EXISTS event_interest CASCADE;
DROP TABLE IF EXISTS scheduled_events CASCADE;
DROP TABLE IF EXISTS guild_stickers CASCADE;
DROP TABLE IF EXISTS user_2fa CASCADE;
DROP TABLE IF EXISTS pinned_messages CASCADE;
DROP TABLE IF EXISTS message_pins_meta CASCADE;
DROP TABLE IF EXISTS scheduled_actions CASCADE;
DROP TABLE IF EXISTS ban_waves CASCADE;
DROP TABLE IF EXISTS guild_member_avatars CASCADE;
DROP TABLE IF EXISTS guild_member_banners CASCADE;
ALTER TABLE IF EXISTS guild_members DROP COLUMN IF EXISTS bio;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    username_hash TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    encrypted_key TEXT NOT NULL DEFAULT '',
    roles TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    last_login_ip TEXT NOT NULL DEFAULT '',
    previous_username_hashes TEXT NOT NULL DEFAULT '',
    keyfile_hash TEXT NOT NULL DEFAULT '',
    flair TEXT NOT NULL DEFAULT '',
    freq_emojis TEXT NOT NULL DEFAULT '{}',
    is_bot BOOLEAN NOT NULL DEFAULT false,
    bot_username TEXT NOT NULL DEFAULT '',
    bot_username_hash TEXT NOT NULL DEFAULT '',
    bot_discriminator TEXT NOT NULL DEFAULT '',
    theme_id TEXT NOT NULL DEFAULT 'dark',
    ui_prefs TEXT NOT NULL DEFAULT '{}',
    accessibility_prefs TEXT NOT NULL DEFAULT '{}',
    encrypted_lang_id TEXT NOT NULL DEFAULT '',
    presence_status TEXT NOT NULL DEFAULT 'online',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_hash ON users(username_hash) WHERE username_hash != '';
CREATE INDEX IF NOT EXISTS idx_users_bot_username_hash ON users(bot_username_hash) WHERE bot_username_hash != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_bot_name_discriminator ON users(bot_username_hash, bot_discriminator) WHERE bot_username_hash != '';

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS registration_log (
    id SERIAL PRIMARY KEY,
    ip TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reglog_ip_created ON registration_log(ip, created_at);

CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_hash TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    banner TEXT NOT NULL DEFAULT '',
    banner_crop TEXT NOT NULL DEFAULT '',
    welcome_channel_id TEXT NOT NULL DEFAULT '',
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_members (
    guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roles TEXT NOT NULL DEFAULT '',
    nickname TEXT NOT NULL DEFAULT '',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gm_user ON guild_members(user_id);

CREATE TABLE IF NOT EXISTS guild_invites (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    uses INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gi_code ON guild_invites(code);

CREATE TABLE IF NOT EXISTS guild_bans (
    guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_guild_bans_user ON guild_bans(user_id);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#99aab5',
    description TEXT NOT NULL DEFAULT '',
    permissions BIGINT NOT NULL DEFAULT 0,
    deny BIGINT NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    mentionable BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'permissions'
          AND data_type IN ('integer', 'text')
    ) THEN
        ALTER TABLE roles ALTER COLUMN permissions DROP DEFAULT;
        ALTER TABLE roles ALTER COLUMN permissions TYPE BIGINT USING (
            CASE
                WHEN permissions::TEXT ~ '^-?[0-9]+$' THEN permissions::TEXT::BIGINT
                ELSE 0
            END
        );
        ALTER TABLE roles ALTER COLUMN permissions SET DEFAULT 0;
        ALTER TABLE roles ALTER COLUMN permissions SET NOT NULL;
    END IF;
END $$;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deny BIGINT NOT NULL DEFAULT 0;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'deny'
          AND data_type = 'integer'
    ) THEN
        ALTER TABLE roles ALTER COLUMN deny DROP DEFAULT;
        ALTER TABLE roles ALTER COLUMN deny TYPE BIGINT USING deny::BIGINT;
        ALTER TABLE roles ALTER COLUMN deny SET DEFAULT 0;
    END IF;
END $$;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_guild ON roles(guild_id);
CREATE INDEX IF NOT EXISTS idx_roles_guild_type ON roles(guild_id, type);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    name_hash TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_categories_name_hash ON categories(name_hash);
CREATE INDEX IF NOT EXISTS idx_categories_guild ON categories(guild_id);

CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL DEFAULT '',
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    position INTEGER NOT NULL DEFAULT 0,
    name_hash TEXT NOT NULL DEFAULT '',
    category_id TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'text'
);
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
CREATE INDEX IF NOT EXISTS idx_channels_name_hash ON channels(name_hash);
CREATE INDEX IF NOT EXISTS idx_channels_guild ON channels(guild_id);

CREATE TABLE IF NOT EXISTS channel_permissions (
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    perms TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (channel_id, role_id)
);

CREATE TABLE IF NOT EXISTS category_permissions (
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    perms TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (category_id, role_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL DEFAULT '',
    channel_id TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    author_perms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited BOOLEAN NOT NULL DEFAULT false,
    reply_to TEXT NOT NULL DEFAULT '',
    command_name TEXT NOT NULL DEFAULT '',
    command_args TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'user',
    embed_data TEXT NOT NULL DEFAULT '',
    invoker_id TEXT NOT NULL DEFAULT '',
    interaction_id TEXT NOT NULL DEFAULT '',
    system_type TEXT NOT NULL DEFAULT '',
    meta TEXT NOT NULL DEFAULT '',
    components TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_guild ON messages(guild_id);

CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL DEFAULT '',
    message_id TEXT NOT NULL DEFAULT '',
    channel_id TEXT NOT NULL DEFAULT '',
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    file_hash TEXT NOT NULL DEFAULT '',
    ref_count INTEGER NOT NULL DEFAULT 1,
    storage_path TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_hash ON attachments(file_hash);
CREATE INDEX IF NOT EXISTS idx_attachments_guild ON attachments(guild_id);

CREATE TABLE IF NOT EXISTS avatars (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_avatars_user ON avatars(user_id);

CREATE TABLE IF NOT EXISTS notifications (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL DEFAULT '',
    channel_id TEXT NOT NULL,
    unread INTEGER NOT NULL DEFAULT 0,
    mentions INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, channel_id)
);
CREATE INDEX IF NOT EXISTS idx_notifications_guild ON notifications(user_id, guild_id);

CREATE TABLE IF NOT EXISTS bans (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    banned_by TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_bans (
    ip TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dm_conversations (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    closed_by_user1 BOOLEAN NOT NULL DEFAULT false,
    closed_by_user2 BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id)
);
CREATE INDEX IF NOT EXISTS idx_dm_user1 ON dm_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_dm_user2 ON dm_conversations(user2_id);

CREATE TABLE IF NOT EXISTS guild_emojis (
    id TEXT PRIMARY KEY,
    guild_id TEXT REFERENCES guilds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime_enc TEXT NOT NULL,
    size BIGINT NOT NULL,
    animated BOOLEAN NOT NULL DEFAULT FALSE,
    category TEXT NOT NULL DEFAULT '',
    created_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_id, name)
);
ALTER TABLE guild_emojis ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS accessibility_prefs TEXT NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS keyfile_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users DROP COLUMN IF EXISTS encrypted_email;
ALTER TABLE users DROP COLUMN IF EXISTS email_hash;
DROP INDEX IF EXISTS idx_users_email_hash;
DROP TABLE IF EXISTS email_verifications;
CREATE INDEX IF NOT EXISTS idx_guild_emojis_guild ON guild_emojis(guild_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_emojis_default_name ON guild_emojis(name) WHERE guild_id IS NULL;

CREATE TABLE IF NOT EXISTS reactions (
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji_id TEXT NOT NULL REFERENCES guild_emojis(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id, emoji_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_emoji ON reactions(emoji_id);

CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_friends_from ON friends(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friends_to ON friends(to_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friends_pair ON friends(from_user_id, to_user_id);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_action TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_action TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS guild_listings (
    guild_id        TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
    slug            TEXT NOT NULL UNIQUE,
    guild_name      TEXT NOT NULL DEFAULT '',
    bio             TEXT NOT NULL DEFAULT '',
    tags            TEXT NOT NULL DEFAULT '',
    language        TEXT NOT NULL DEFAULT 'en',
    nsfw            BOOLEAN NOT NULL DEFAULT false,
    invite_code     TEXT NOT NULL DEFAULT '',
    published       BOOLEAN NOT NULL DEFAULT true,
    bumped_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bump_count      INTEGER NOT NULL DEFAULT 0,
    rating_avg      REAL NOT NULL DEFAULT 0,
    rating_count    INTEGER NOT NULL DEFAULT 0,
    listed_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    search_name_tsv TSVECTOR NOT NULL DEFAULT ''::tsvector,
    search_bio_tsv  TSVECTOR NOT NULL DEFAULT ''::tsvector,
    search_tag_tsv  TSVECTOR NOT NULL DEFAULT ''::tsvector
);
CREATE INDEX IF NOT EXISTS idx_listings_bumped   ON guild_listings(bumped_at DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_listings_language ON guild_listings(language)       WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_listings_nsfw     ON guild_listings(nsfw)           WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_listings_rating   ON guild_listings(rating_avg DESC) WHERE published = true AND rating_count >= 3;
CREATE INDEX IF NOT EXISTS idx_listings_name_fts ON guild_listings USING gin(search_name_tsv) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_listings_bio_fts  ON guild_listings USING gin(search_bio_tsv) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_listings_tag_fts  ON guild_listings USING gin(search_tag_tsv) WHERE published = true;

CREATE TABLE IF NOT EXISTS guild_listing_bumps (
    guild_id  TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bumped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id, bumped_at)
);
CREATE INDEX IF NOT EXISTS idx_listing_bumps_user_recent ON guild_listing_bumps(user_id, bumped_at DESC);

CREATE TABLE IF NOT EXISTS guild_listing_ratings (
    guild_id   TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars      SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_listing_ratings_guild ON guild_listing_ratings(guild_id);

CREATE TABLE IF NOT EXISTS bot_applications (
    id            TEXT PRIMARY KEY,
    owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_user_id   TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    token_hash    TEXT NOT NULL UNIQUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bot_apps_owner ON bot_applications(owner_id);

CREATE TABLE IF NOT EXISTS bot_commands (
    id                  TEXT PRIMARY KEY,
    bot_user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guild_id            TEXT NOT NULL DEFAULT '',
    name                TEXT NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    args_json           TEXT NOT NULL DEFAULT '[]',
    permission_required BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_commands_unique ON bot_commands(bot_user_id, guild_id, name);
CREATE INDEX IF NOT EXISTS idx_bot_commands_bot ON bot_commands(bot_user_id);
CREATE INDEX IF NOT EXISTS idx_bot_commands_guild ON bot_commands(guild_id);

CREATE TABLE IF NOT EXISTS bot_audit (
    id           TEXT PRIMARY KEY,
    bot_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route        TEXT NOT NULL,
    guild_id     TEXT NOT NULL DEFAULT '',
    status       INTEGER NOT NULL DEFAULT 0,
    at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bot_audit_bot_at ON bot_audit(bot_user_id, at DESC);

CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    crop TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_user ON banners(user_id);

CREATE TABLE IF NOT EXISTS guild_avatars (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL DEFAULT '',
    size BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_guild_avatars_guild ON guild_avatars(guild_id);

CREATE TABLE IF NOT EXISTS guild_banners (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL DEFAULT '',
    size BIGINT NOT NULL DEFAULT 0,
    crop TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_guild_banners_guild ON guild_banners(guild_id);

CREATE TABLE IF NOT EXISTS interactions (
    id                 TEXT PRIMARY KEY,
    token              TEXT NOT NULL UNIQUE,
    app_id             TEXT NOT NULL DEFAULT '',
    bot_user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoker_user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id         TEXT NOT NULL,
    guild_id           TEXT NOT NULL DEFAULT '',
    command_name       TEXT NOT NULL,
    options_json       TEXT NOT NULL DEFAULT '{}',
    status             TEXT NOT NULL DEFAULT 'pending',
    ephemeral          BOOLEAN NOT NULL DEFAULT false,
    source_message_id  TEXT NOT NULL DEFAULT '',
    custom_id          TEXT NOT NULL DEFAULT '',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at         TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interactions_bot ON interactions(bot_user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_expires ON interactions(expires_at) WHERE status = 'pending';

ALTER TABLE interactions ADD COLUMN IF NOT EXISTS app_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS webhooks (
    id              TEXT PRIMARY KEY,
    guild_id        TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    channel_id      TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Webhook',
    avatar_id       TEXT NOT NULL DEFAULT '',
    token_hash      TEXT NOT NULL UNIQUE,
    created_by      TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at    TIMESTAMP,
    use_count       BIGINT NOT NULL DEFAULT 0,
    rate_limit_per  INT NOT NULL DEFAULT 0,
    disabled        BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_webhooks_guild ON webhooks(guild_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_channel ON webhooks(channel_id);

CREATE TABLE IF NOT EXISTS vanity_urls (
    slug         TEXT PRIMARY KEY,
    guild_id     TEXT NOT NULL UNIQUE REFERENCES guilds(id) ON DELETE CASCADE,
    set_by       TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    use_count    BIGINT NOT NULL DEFAULT 0,
    locked       BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_vanity_guild ON vanity_urls(guild_id);

CREATE TABLE IF NOT EXISTS reserved_vanities (
    slug         TEXT PRIMARY KEY,
    reason       TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    id           TEXT PRIMARY KEY,
    guild_id     TEXT NOT NULL DEFAULT '',
    actor_id     TEXT NOT NULL,
    target_type  TEXT NOT NULL,
    target_id    TEXT NOT NULL DEFAULT '',
    action       TEXT NOT NULL,
    reason       TEXT NOT NULL DEFAULT '',
    metadata     TEXT NOT NULL DEFAULT '{}',
    is_site      BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_guild ON audit_log(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_site ON audit_log(is_site, created_at DESC) WHERE is_site = true;
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_type, target_id);

CREATE TABLE IF NOT EXISTS admin_warnings (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_by     TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    reasons       TEXT NOT NULL DEFAULT '[]',
    note          TEXT NOT NULL DEFAULT '',
    severity      INT NOT NULL DEFAULT 1,
    acknowledged  BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_warnings_user ON admin_warnings(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_prefs (
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope_type        TEXT NOT NULL,
    scope_id          TEXT NOT NULL DEFAULT '',
    level             TEXT NOT NULL DEFAULT 'mentions',
    suppress_everyone BOOLEAN NOT NULL DEFAULT false,
    suppress_roles    BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS pinned_messages (
    channel_id  TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    message_id  TEXT NOT NULL,
    pinned_by   TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    pinned_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_pinned_channel ON pinned_messages(channel_id, pinned_at DESC);

CREATE TABLE IF NOT EXISTS user_warnings_unread (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warning_id  TEXT NOT NULL REFERENCES admin_warnings(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, warning_id)
);

ALTER TABLE channels ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS slowmode_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS nsfw BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS auto_archive_minutes INT NOT NULL DEFAULT 1440;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS user_limit INT NOT NULL DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS parent_channel_id TEXT NOT NULL DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS parent_message_id TEXT NOT NULL DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS message_count INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_channels_parent ON channels(parent_channel_id) WHERE parent_channel_id <> '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS bitrate INT NOT NULL DEFAULT 64000;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rtc_region TEXT NOT NULL DEFAULT '';
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS token_enc TEXT NOT NULL DEFAULT '';

ALTER TABLE guilds ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS suspended_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP;

ALTER TABLE site_admins ADD COLUMN IF NOT EXISTS user_id TEXT;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='site_admins') THEN
        CREATE TABLE site_admins (
            user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            promoted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            promoted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            note        TEXT NOT NULL DEFAULT ''
        );
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_site_admins_promoted_at ON site_admins(promoted_at DESC);

CREATE TABLE IF NOT EXISTS webhook_avatars (
    id          TEXT PRIMARY KEY,
    webhook_id  TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    mime_type   TEXT NOT NULL,
    size        INTEGER NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_avatars_webhook ON webhook_avatars(webhook_id);

ALTER TABLE users DROP COLUMN IF EXISTS custom_status_text;
ALTER TABLE users DROP COLUMN IF EXISTS custom_status_emoji;
ALTER TABLE users DROP COLUMN IF EXISTS custom_status_expires_at;

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_preview TEXT NOT NULL DEFAULT '';
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS flags BIGINT NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS duration_secs DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS waveform TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS flags BIGINT NOT NULL DEFAULT 0;

ALTER TABLE bot_applications ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE channel_permissions ADD COLUMN IF NOT EXISTS allow BIGINT NOT NULL DEFAULT 0;
ALTER TABLE channel_permissions ADD COLUMN IF NOT EXISTS deny BIGINT NOT NULL DEFAULT 0;

ALTER TABLE category_permissions ADD COLUMN IF NOT EXISTS allow BIGINT NOT NULL DEFAULT 0;
ALTER TABLE category_permissions ADD COLUMN IF NOT EXISTS deny BIGINT NOT NULL DEFAULT 0;

DO $$
DECLARE
    pair RECORD;
BEGIN
    FOR pair IN
        SELECT table_name, column_name FROM information_schema.columns
        WHERE table_name IN ('channel_permissions', 'category_permissions')
          AND column_name IN ('allow', 'deny')
          AND data_type = 'integer'
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', pair.table_name, pair.column_name);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE BIGINT USING %I::BIGINT', pair.table_name, pair.column_name, pair.column_name);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT 0', pair.table_name, pair.column_name);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL', pair.table_name, pair.column_name);
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION remap_perm_bits(b BIGINT) RETURNS BIGINT AS $$
BEGIN
    IF b IS NULL THEN RETURN 0; END IF;
    RETURN
        (CASE WHEN (b & (1::bigint<<0))  <> 0 THEN 1::bigint<<0  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<1))  <> 0 THEN 1::bigint<<1  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<2))  <> 0 THEN 1::bigint<<2  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<3))  <> 0 THEN 1::bigint<<3  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<4))  <> 0 THEN 1::bigint<<4  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<5))  <> 0 THEN 1::bigint<<5  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<6))  <> 0 THEN 1::bigint<<6  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<7))  <> 0 THEN 1::bigint<<7  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<8))  <> 0 THEN 1::bigint<<8  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<9))  <> 0 THEN 1::bigint<<9  ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<10)) <> 0 THEN 1::bigint<<10 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<11)) <> 0 THEN 1::bigint<<11 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<13)) <> 0 THEN 1::bigint<<12 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<14)) <> 0 THEN 1::bigint<<13 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<21)) <> 0 THEN 1::bigint<<14 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<22)) <> 0 THEN 1::bigint<<15 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<23)) <> 0 THEN 1::bigint<<16 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<24)) <> 0 THEN 1::bigint<<17 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<25)) <> 0 THEN 1::bigint<<18 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<31)) <> 0 THEN 1::bigint<<19 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<33)) <> 0 THEN 1::bigint<<20 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<34)) <> 0 THEN 1::bigint<<21 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<35)) <> 0 THEN 1::bigint<<22 ELSE 0 END) |
        (CASE WHEN (b & (1::bigint<<36)) <> 0 THEN 1::bigint<<23 ELSE 0 END);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = 'migration_007_perm_renumber.sql') THEN
        UPDATE roles SET permissions = remap_perm_bits(permissions), deny = remap_perm_bits(deny);
        UPDATE channel_permissions SET allow = remap_perm_bits(allow), deny = remap_perm_bits(deny);
        UPDATE category_permissions SET allow = remap_perm_bits(allow), deny = remap_perm_bits(deny);
        INSERT INTO schema_migrations (filename) VALUES ('migration_007_perm_renumber.sql');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = 'migration_008_messages_guild_id_backfill.sql') THEN
        UPDATE messages
        SET guild_id = COALESCE((SELECT guild_id FROM channels WHERE channels.id = messages.channel_id), '')
        WHERE guild_id = '' AND channel_id IS NOT NULL;
        INSERT INTO schema_migrations (filename) VALUES ('migration_008_messages_guild_id_backfill.sql');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS gif_tabs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gif_tabs_user ON gif_tabs(user_id, position);

CREATE TABLE IF NOT EXISTS gif_favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tab_id TEXT REFERENCES gif_tabs(id) ON DELETE SET NULL,
    tenor_id TEXT NOT NULL,
    url TEXT NOT NULL,
    preview_url TEXT NOT NULL,
    width INT NOT NULL DEFAULT 0,
    height INT NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, tenor_id, tab_id)
);
CREATE INDEX IF NOT EXISTS idx_gif_favs_user ON gif_favorites(user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_gif_favs_tab ON gif_favorites(tab_id, saved_at DESC);