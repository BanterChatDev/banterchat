package guilds

type Config struct {
	MinName int
	MaxName int
}

func DefaultConfig() Config {
	return Config{
		MinName: 2,
		MaxName: 100,
	}
}