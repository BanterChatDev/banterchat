package webhooks

type Config struct {
	DefaultName   string
	MaxNameLen    int
	MaxContentLen int
	MaxEmbeds     int
}

func DefaultConfig() Config {
	return Config{
		DefaultName:   "Webhook",
		MaxNameLen:    80,
		MaxContentLen: 4000,
		MaxEmbeds:     10,
	}
}