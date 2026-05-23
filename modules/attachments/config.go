package attachments

type Config struct {
	MaxSize           int64
	MaxFileCount      int
	MaxImageDimension int
	MaxImagePixels    int
	StoragePath       string
}

func DefaultConfig() Config {
	return Config{
		MaxSize:           75 * 1024 * 1024,
		MaxFileCount:      10,
		MaxImageDimension: 8192,
		MaxImagePixels:    25_000_000,
		StoragePath:       "assets/media/attachments",
	}
}