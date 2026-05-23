package roles

import "ror/modules/permissions"

const (
	AdminRoleID   = "00000000000000000000000000000001"
	DefaultRoleID = "00000000000000000000000000000002"
)

type Config struct {
	AdminColor      string
	DefaultColor    string
	BotColors       []string
	AdminName       string
	AdminDesc       string
	EveryoneName    string
	EveryoneDesc    string
	AdminPosition   int
	DefaultPosition int
	AdminPerms      int64
	DefaultPerms    int64
	MinName         int
	MaxName         int
	MaxDesc         int
}

func DefaultConfig() Config {
	return Config{
		AdminColor:   "#ed4245",
		DefaultColor: "#99aab5",
		BotColors: []string{
			"#5865f2", "#3ba55c", "#faa61a", "#ed4245", "#9b59b6",
			"#11806a", "#1abc9c", "#e91e63", "#f47b67", "#7289da",
		},
		AdminName:       "admin",
		AdminDesc:       "Server administrator",
		EveryoneName:    "@everyone",
		EveryoneDesc:    "Default role for all members",
		AdminPosition:   1,
		DefaultPosition: 999,
		AdminPerms:      int64(permissions.PermAdministrator),
		DefaultPerms:    int64(permissions.PermViewChannels | permissions.PermSendMessages | permissions.PermUseSlashCommands | permissions.PermAttachFiles),
		MinName:         2,
		MaxName:         30,
		MaxDesc:         256,
	}
}