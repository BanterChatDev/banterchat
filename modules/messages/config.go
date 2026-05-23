package messages

type Config struct {
	MaxLength    int
	DefaultLimit int
	MaxLimit     int
}

func DefaultConfig() Config {
	return Config{
		MaxLength:    10000,
		DefaultLimit: 50,
		MaxLimit:     50,
	}
}