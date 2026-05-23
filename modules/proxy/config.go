package proxy

type Config struct {
	MaxSize     int64
	TimeoutSecs int
}

func DefaultConfig() Config {
	return Config{
		MaxSize:     10485760,
		TimeoutSecs: 10,
	}
}