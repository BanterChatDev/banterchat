package dms

type Perms struct {
	SendMessages   bool
	ViewChannels   bool
	AttachFiles    bool
	ManageMessages bool
}

type Config struct {
	Enabled          bool
	MaxConversations int
	Perms            Perms
}

func DefaultConfig() Config {
	return Config{
		Enabled:          true,
		MaxConversations: 100,
		Perms: Perms{
			SendMessages:   true,
			ViewChannels:   true,
			AttachFiles:    true,
			ManageMessages: false,
		},
	}
}