package invites

type Config struct {
	ReservedSlugs []string
}

func DefaultConfig() Config {
	return Config{
		ReservedSlugs: []string{
			"admin", "administrator", "staff", "moderator", "moderators", "mod", "support",
			"help", "api", "www", "mail", "email", "ftp", "smtp", "static", "assets",
			"cdn", "media", "files", "upload", "uploads", "download", "downloads",
			"home", "about", "info", "terms", "privacy", "tos", "policy", "legal",
			"login", "logout", "signup", "register", "auth", "oauth", "oauth2",
			"settings", "preferences", "account", "profile", "user", "users", "me",
			"server", "servers", "guild", "guilds", "channel", "channels", "dm", "dms",
			"discover", "discovery", "explore", "search", "trending",
			"banter", "banterchat", "banter-chat", "official", "verified", "system",
			"bot", "bots", "app", "apps", "developer", "developers", "dev",
			"news", "blog", "status", "report", "reports", "abuse",
			"security", "safety", "trust", "transparency",
			"null", "undefined", "void", "anonymous", "anon",
			"v", "channel", "invite", "i", "g", "u", "@me", "@everyone", "@here",
		},
	}
}