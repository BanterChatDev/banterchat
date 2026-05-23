package embed

type Config struct {
	MaxFields    int
	MaxTitleLen  int
	MaxDescLen   int
	MaxFieldName int
	MaxFieldVal  int
	MaxFooterLen int
	MaxAuthorLen int
}

func (c Config) GetMaxFields() int    { return c.MaxFields }
func (c Config) GetMaxTitleLen() int  { return c.MaxTitleLen }
func (c Config) GetMaxDescLen() int   { return c.MaxDescLen }
func (c Config) GetMaxFieldName() int { return c.MaxFieldName }
func (c Config) GetMaxFieldVal() int  { return c.MaxFieldVal }
func (c Config) GetMaxFooterLen() int { return c.MaxFooterLen }
func (c Config) GetMaxAuthorLen() int { return c.MaxAuthorLen }

func DefaultConfig() Config {
	return Config{
		MaxFields:    25,
		MaxTitleLen:  256,
		MaxDescLen:   4096,
		MaxFieldName: 256,
		MaxFieldVal:  1024,
		MaxFooterLen: 2048,
		MaxAuthorLen: 256,
	}
}