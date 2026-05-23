package conf

var (
	HTTPAddr    = ":3030"
	Domain      = "localhost"
	Secure      = false
	MaxBodySize = "10M"
	APIVersion  = "v1"

	UsernameBlacklist = []string{
		"admin", "administrator", "banter", "bot", "deleted",
		"everyone", "here", "mod", "moderator", "official",
		"root", "staff", "support", "system",
	}

	TermsURL = "http://localhost/terms"

	AllowedOrigins = []string{
		"http://localhost",
		"http://localhost:3030",
	}

	MasterKey = "c5bfc00463be3625e448b1342087d304f43d954553e90a8f76dcaffb20f9c7e2"

	SiteAdmins = []string{}

	DBHost     = "127.0.0.1"
	DBPort     = 5433
	DBUser     = "banter"
	DBPassword = "0646119aaf46e46f9641d454ce596c3c"
	DBName     = "banter"
	DBSSLMode  = "disable"

	LiveKitURL       = ""
	LiveKitAPIKey    = ""
	LiveKitAPISecret = ""

	TenorAPIKey = ""

	DiscoveryURL = ""
)

func APIPrefix() string {
	return "/api/" + APIVersion
}