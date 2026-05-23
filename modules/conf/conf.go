package conf

import (
	"ror/modules/attachments"
	"ror/modules/auth"
	"ror/modules/avatar"
	"ror/modules/banner"
	"ror/modules/bots"
	"ror/modules/channels"
	"ror/modules/db"
	"ror/modules/dms"
	"ror/modules/embed"
	"ror/modules/emojis"
	"ror/modules/gifs"
	"ror/modules/invites"
	"ror/modules/keyfile"
	"ror/modules/messages"
	"ror/modules/guilds"
	"ror/modules/proxy"
	"ror/modules/ratelimit"
	"ror/modules/reactions"
	"ror/modules/roles"
	"ror/modules/users"
	"ror/modules/voicechat"
	"ror/modules/webhooks"
	"ror/modules/websocket"
)

type Provider interface {
	Server() Server
	Auth() auth.Config
	Attachments() attachments.Config
	Avatar() avatar.Config
	Banner() banner.Config
	Channels() channels.Config
	DB() db.Config
	DMs() dms.Config
	Embed() embed.Config
	Emojis() emojis.Config
	Gifs() gifs.Config
	Invites() invites.Config
	Keyfile() keyfile.Config
	Messages() messages.Config
	Guilds() guilds.Config
	Proxy() proxy.Config
	RateLimit() ratelimit.Limits
	Reactions() reactions.Config
	Roles() roles.Config
	Users() users.Config
	VoiceChat() voicechat.Config
	Webhooks() webhooks.Config
	WS() websocket.Config
}

type Default struct{}

func (Default) Server() Server {
	return DefaultServer()
}

func (Default) Auth() auth.Config {
	return auth.DefaultConfig()
}

func (Default) Attachments() attachments.Config {
	return attachments.DefaultConfig()
}

func (Default) Avatar() avatar.Config {
	return avatar.DefaultConfig()
}

func (Default) Banner() banner.Config {
	return banner.DefaultConfig()
}

func (Default) Bots() bots.Config {
	return bots.DefaultConfig()
}

func (Default) Channels() channels.Config {
	return channels.DefaultConfig()
}

func (Default) DB() db.Config {
	return db.DefaultConfig()
}

func (Default) DMs() dms.Config {
	return dms.DefaultConfig()
}

func (Default) Embed() embed.Config {
	return embed.DefaultConfig()
}

func (Default) Emojis() emojis.Config {
	return emojis.DefaultConfig()
}

func (Default) Gifs() gifs.Config {
	return gifs.DefaultConfig()
}

func (Default) Invites() invites.Config {
	return invites.DefaultConfig()
}

func (Default) Keyfile() keyfile.Config {
	return keyfile.DefaultConfig()
}

func (Default) Messages() messages.Config {
	return messages.DefaultConfig()
}

func (Default) Guilds() guilds.Config {
	return guilds.DefaultConfig()
}

func (Default) Proxy() proxy.Config {
	return proxy.DefaultConfig()
}

func (Default) RateLimit() ratelimit.Limits {
	return ratelimit.DefaultLimits()
}

func (Default) Reactions() reactions.Config {
	return reactions.DefaultConfig()
}

func (Default) Roles() roles.Config {
	return roles.DefaultConfig()
}

func (Default) Users() users.Config {
	return users.DefaultConfig()
}

func (Default) VoiceChat() voicechat.Config {
	return voicechat.DefaultConfig()
}

func (Default) Webhooks() webhooks.Config {
	return webhooks.DefaultConfig()
}

func (Default) WS() websocket.Config {
	return websocket.DefaultConfig()
}