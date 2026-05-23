package gifs

type Config struct {
	Provider       string
	Client         string
	BaseURL        string
	ContentFilter  string
	SearchLimit    int
	TrendingLimit  int
	MaxFavorites   int
	MaxTabs        int
	MaxTabName     int
}

func DefaultConfig() Config {
	return Config{
		Provider:      "tenor",
		Client:        "banter",
		BaseURL:       "https://tenor.googleapis.com/v2",
		ContentFilter: "off",
		SearchLimit:   24,
		TrendingLimit: 24,
		MaxFavorites:  500,
		MaxTabs:       20,
		MaxTabName:    32,
	}
}