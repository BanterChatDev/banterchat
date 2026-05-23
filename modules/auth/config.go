package auth

type Config struct {
	MinUsername           int
	MaxUsername           int
	MinPassword           int
	MaxPassword           int
	MaxRegistrationsPerIP int
}

func DefaultConfig() Config {
	return Config{
		MinUsername:           3,
		MaxUsername:           20,
		MinPassword:           8,
		MaxPassword:           72,
		MaxRegistrationsPerIP: 30,
	}
}