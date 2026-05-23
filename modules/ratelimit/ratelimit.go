package ratelimit

import (
	"sync"
	"time"
)

type RuleConfig struct {
	Method     string
	PathPrefix string
	Rate       float64
	Burst      int
	Period     time.Duration
}

type Config struct {
	Enabled       bool
	APIPrefix     string
	SkipPaths     []string
	Rules         []RuleConfig
	CleanupPeriod time.Duration
	GlobalRate    int
	GlobalBurst   int
}

type Limiter struct {
	config  Config
	buckets map[string]*bucket
	mu      sync.RWMutex
	stop    chan struct{}
}

func New(cfg Config) *Limiter {
	if cfg.APIPrefix == "" {
		cfg.APIPrefix = "/api/"
	}
	if cfg.CleanupPeriod == 0 {
		cfg.CleanupPeriod = 5 * time.Minute
	}
	l := &Limiter{
		config:  cfg,
		buckets: make(map[string]*bucket),
		stop:    make(chan struct{}),
	}
	go l.cleanup()
	return l
}

func (l *Limiter) Stop() {
	close(l.stop)
}