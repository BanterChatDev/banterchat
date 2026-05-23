package websocket

import "time"

type Config struct {
	ReadLimit          int64
	MaxConnections     int
	AllowedOrigins     []string
	InboundWorkers     int
	InboundQueue       int
	ClientSendBuffer   int
	ReadBufferSize     int
	WriteBufferSize    int
	OfflineGracePeriod time.Duration
	WriteWait          time.Duration
	PongWait           time.Duration
	PingPeriod         time.Duration
}

func DefaultConfig() Config {
	domain := "banterchat.org"
	return Config{
		ReadLimit:          1048576,
		MaxConnections:     5,
		InboundWorkers:     32,
		InboundQueue:       8192,
		ClientSendBuffer:   8192,
		ReadBufferSize:     4096,
		WriteBufferSize:    4096,
		OfflineGracePeriod: 10 * time.Second,
		WriteWait:          10 * time.Second,
		PongWait:           60 * time.Second,
		PingPeriod:         54 * time.Second,
		AllowedOrigins: []string{
			"https://" + domain,
			"http://" + domain,
			"http://localhost:3030",
			"http://203.161.60.25:3030",
			"http://203.161.60.25",
			"http://10.2.0.2:3030",
		},
	}
}