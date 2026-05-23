package bots

type Config struct {
	Enabled              bool
	MaxAppsPerUser       int
	MaxCommandsPerBot    int
	MaxCommandsPerGuild  int
	TokenBytes           int
	CommandNameMaxLen    int
	CommandDescMaxLen    int
	CommandArgMaxLen     int
	CommandArgsPerCmd    int
	InteractionTimeoutMs int

	GlobalRate    int
	GlobalBurst   int
	MsgRate       int
	MsgBurst      int
	ReadRate      int
	ReadBurst     int
	InteractRate  int
	InteractBurst int
	RegisterRate  int
	RegisterBurst int
	ChannelsRate  int
	ChannelsBurst int
	RolesRate     int
	RolesBurst    int
	MembersRate   int
	MembersBurst  int

	GatewayHeartbeatMs int
	GatewayResumeWinS  int
	GatewayMaxIntents  int64

	AuditRetentionDays int
	AuditMaxPerBot     int
}

func DefaultConfig() Config {
	return Config{
		Enabled:              true,
		MaxAppsPerUser:       10,
		MaxCommandsPerBot:    50,
		MaxCommandsPerGuild:  200,
		TokenBytes:           32,
		CommandNameMaxLen:    32,
		CommandDescMaxLen:    100,
		CommandArgMaxLen:     100,
		CommandArgsPerCmd:    10,
		InteractionTimeoutMs: 3000,

		GlobalRate:    50,
		GlobalBurst:   20,
		MsgRate:       30,
		MsgBurst:      30,
		ReadRate:      60,
		ReadBurst:     40,
		InteractRate:  60,
		InteractBurst: 40,
		RegisterRate:  2,
		RegisterBurst: 5,
		ChannelsRate:  60,
		ChannelsBurst: 100,
		RolesRate:     60,
		RolesBurst:    50,
		MembersRate:   60,
		MembersBurst:  50,

		GatewayHeartbeatMs: 41250,
		GatewayResumeWinS:  90,
		GatewayMaxIntents:  131071,

		AuditRetentionDays: 30,
		AuditMaxPerBot:     1000,
	}
}