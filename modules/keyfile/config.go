package keyfile

type Config struct {
	Enabled     bool
	KeyfileSize int
}

func DefaultConfig() Config {
	return Config{
		Enabled:     true,
		KeyfileSize: 32,
	}
}