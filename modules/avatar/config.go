package avatar

type UserConfig struct {
	MaxSize     int64
	MaxPixels   int
	StoragePath string
}

type GuildConfig struct {
	MaxSize     int64
	MaxPixels   int
	StoragePath string
}

type Config struct {
	User  UserConfig
	Guild GuildConfig
}

func DefaultConfig() Config {
	return Config{
		User: UserConfig{
			MaxSize:     4 * 1024 * 1024,
			MaxPixels:   8_000_000,
			StoragePath: "assets/media/avatars",
		},
		Guild: GuildConfig{
			MaxSize:     4 * 1024 * 1024,
			MaxPixels:   8_000_000,
			StoragePath: "assets/media/guild_avatars",
		},
	}
}