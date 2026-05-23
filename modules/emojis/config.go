package emojis

type Config struct {
	MaxSize       int64
	MaxPerGuild   int
	MaxDimension  int
	MinDimension  int
	MaxPixels     int
	NameMinLen    int
	NameMaxLen    int
	AspectMin     float64
	AspectMax     float64
	StoragePath   string
	DefaultSubdir string
	IDLength      int
}

func DefaultConfig() Config {
	return Config{
		MaxSize:       256 * 1024,
		MaxPerGuild:   100,
		MaxDimension:  128,
		MinDimension:  16,
		MaxPixels:     1_000_000,
		NameMinLen:    2,
		NameMaxLen:    32,
		AspectMin:     0.8,
		AspectMax:     1.25,
		StoragePath:   "assets/media/emojis",
		DefaultSubdir: "default",
		IDLength:      16,
	}
}