package conf

import "os"

type Blacklist struct {
	Usernames []string
}

type Server struct {
	HTTPAddr    string
	Domain      string
	Secure      bool
	MaxBodySize string
	APIVersion  string
	Blacklist   Blacklist
}

func (s Server) Addr() string {
	return s.HTTPAddr
}

func (s Server) APIPrefix() string {
	return "/api/" + s.APIVersion
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func DefaultServer() Server {
	return Server{
		HTTPAddr:    envOr("HTTP_ADDR", ":3030"),
		Domain:      envOr("DOMAIN", "localhost"),
		Secure:      os.Getenv("SECURE_COOKIES") == "true",
		MaxBodySize: envOr("MAX_BODY_SIZE", "10M"),
		APIVersion:  "v1",
		Blacklist: Blacklist{
			Usernames: []string{
				"admin", "administrator", "banter", "bot", "deleted",
				"everyone", "here", "mod", "moderator", "official",
				"root", "staff", "support", "system",
			},
		},
	}
}