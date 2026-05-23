package websocket

import (
	"os"
	"strings"
	"time"
)

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

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func DefaultConfig() Config {
	domain := envOr("DOMAIN", "localhost")
	origins := []string{
		"https://" + domain,
		"http://" + domain,
		"http://localhost:3030",
	}
	if extra := os.Getenv("WS_EXTRA_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}
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
		AllowedOrigins:     origins,
	}
}