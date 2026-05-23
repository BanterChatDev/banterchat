package reactions

type Config struct {
	MaxPerMessage int
}

func DefaultConfig() Config {
	return Config{
		MaxPerMessage: 20,
	}
}