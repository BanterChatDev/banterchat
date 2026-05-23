package users

const (
	DeletedUserName = "DeletedUser"
	DeletedUserTag  = "0000"
)

type Config struct {
	MaxBioLen    int
	DefaultLimit int
	MaxLimit     int
}

func DefaultConfig() Config {
	return Config{
		MaxBioLen:    190,
		DefaultLimit: 50,
		MaxLimit:     500,
	}
}