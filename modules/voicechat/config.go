package voicechat

import "os"

type Config struct {
	APIKey    string
	APISecret string
	URL       string
}

func DefaultConfig() Config {
	return Config{
		APIKey:    os.Getenv("LIVEKIT_API_KEY"),
		APISecret: os.Getenv("LIVEKIT_API_SECRET"),
		URL:       os.Getenv("LIVEKIT_URL"),
	}
}