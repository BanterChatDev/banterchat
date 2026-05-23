package permissions

type PermDef struct {
	Key          string `json:"key"`
	Bit          int64  `json:"bit"`
	Label        string `json:"label"`
	Description  string `json:"description"`
	ChannelLevel bool   `json:"channel_level"`
}

var (
	registry []PermDef
	PermAll  int64
)

func Register(key string, bit int64, label, desc string, channelLevel bool) int64 {
	registry = append(registry, PermDef{Key: key, Bit: bit, Label: label, Description: desc, ChannelLevel: channelLevel})
	PermAll |= bit
	return bit
}

func GetAll() []PermDef { return registry }

func GetChannelLevel() []PermDef {
	var out []PermDef
	for _, p := range registry {
		if p.ChannelLevel {
			out = append(out, p)
		}
	}
	return out
}