package ratelimit

type Limits struct {
	Enabled         bool
	GlobalRate      int
	GlobalBurst     int
	Auth            int
	AuthBurst       int
	MsgSend         int
	MsgSendBurst    int
	Reads           int
	ReadsBurst      int
	Writes          int
	WritesBurst     int
	WS              int
	WSBurst         int
	WSMsg           int
	WSMsgBurst      int
	WSEdit          int
	WSEditBurst     int
	WSDelete        int
	WSDeleteBurst   int
	WSTyping        int
	WSTypingBurst   int
	WSDefault       int
	WSDefaultBurst  int
	WSSlashCmd      int
	WSSlashCmdBurst int
	WSVoice         int
	WSVoiceBurst    int
}

func DefaultLimits() Limits {
	return Limits{
		Enabled:         true,
		GlobalRate:      60,
		GlobalBurst:     30,
		Auth:            10,
		AuthBurst:       5,
		MsgSend:         30,
		MsgSendBurst:    10,
		Reads:           120,
		ReadsBurst:      40,
		Writes:          30,
		WritesBurst:     10,
		WS:              60,
		WSBurst:         20,
		WSMsg:           30,
		WSMsgBurst:      15,
		WSEdit:          10,
		WSEditBurst:     5,
		WSDelete:        10,
		WSDeleteBurst:   5,
		WSTyping:        20,
		WSTypingBurst:   10,
		WSDefault:       15,
		WSDefaultBurst:  8,
		WSSlashCmd:      10,
		WSSlashCmdBurst: 5,
		WSVoice:         60,
		WSVoiceBurst:    20,
	}
}