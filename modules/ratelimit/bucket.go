package ratelimit

import (
	"strings"
	"time"
)

type bucket struct {
	tokens     float64
	lastUpdate time.Time
	rate       float64
	burst      int
}

func (l *Limiter) findRule(method, path string) *RuleConfig {
	for i := range l.config.Rules {
		r := &l.config.Rules[i]
		if r.Method != "" && r.Method != method {
			continue
		}
		if strings.HasPrefix(path, r.PathPrefix) {
			return r
		}
	}
	return nil
}

func ruleKey(prefix, path string) string {
	rest := strings.TrimPrefix(path, prefix)
	if i := strings.Index(rest, "/"); i > 0 {
		return prefix + rest[:i]
	}
	return prefix + rest
}

func (l *Limiter) Allow(ip, method, path string) bool {
	if !l.config.Enabled {
		return true
	}
	rule := l.findRule(method, path)
	if rule == nil {
		return true
	}
	rate := rule.Rate
	if rule.Period > 0 {
		rate = rule.Rate / rule.Period.Seconds()
	}
	key := ip + ":" + rule.Method + ":" + ruleKey(rule.PathPrefix, path)

	l.mu.Lock()
	defer l.mu.Unlock()

	b, exists := l.buckets[key]
	now := time.Now()

	if !exists {
		l.buckets[key] = &bucket{
			tokens:     float64(rule.Burst) - 1,
			lastUpdate: now,
			rate:       rate,
			burst:      rule.Burst,
		}
		return true
	}

	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.tokens += elapsed * b.rate
	if b.tokens > float64(b.burst) {
		b.tokens = float64(b.burst)
	}
	b.lastUpdate = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

func (l *Limiter) AllowWS(userID string) bool {
	return l.Allow(userID, "GET", l.config.APIPrefix+"ws")
}

func (l *Limiter) AllowBot(botID, bucketName string, rate float64, burst int) (bool, float64) {
	if !l.config.Enabled {
		return true, 0
	}
	if rate <= 0 || burst <= 0 {
		return true, 0
	}
	key := "bot:" + botID + ":" + bucketName
	r := rate / 60.0

	l.mu.Lock()
	defer l.mu.Unlock()

	b, exists := l.buckets[key]
	now := time.Now()

	if !exists {
		l.buckets[key] = &bucket{
			tokens:     float64(burst) - 1,
			lastUpdate: now,
			rate:       r,
			burst:      burst,
		}
		return true, 0
	}

	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.tokens += elapsed * b.rate
	if b.tokens > float64(b.burst) {
		b.tokens = float64(b.burst)
	}
	b.lastUpdate = now

	if b.tokens >= 1 {
		b.tokens--
		return true, 0
	}
	retryAfter := (1 - b.tokens) / b.rate
	return false, retryAfter
}

func (l *Limiter) AllowWSPacket(userID, packetType string, rate float64, burst int) (bool, float64) {
	if !l.config.Enabled {
		return true, 0
	}
	if rate <= 0 || burst <= 0 {
		return true, 0
	}
	key := "ws:" + userID + ":" + packetType
	r := rate / 60.0

	l.mu.Lock()
	defer l.mu.Unlock()

	b, exists := l.buckets[key]
	now := time.Now()

	if !exists {
		l.buckets[key] = &bucket{
			tokens:     float64(burst) - 1,
			lastUpdate: now,
			rate:       r,
			burst:      burst,
		}
		return true, 0
	}

	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.tokens += elapsed * b.rate
	if b.tokens > float64(b.burst) {
		b.tokens = float64(b.burst)
	}
	b.lastUpdate = now

	if b.tokens >= 1 {
		b.tokens--
		return true, 0
	}
	retryAfter := (1 - b.tokens) / b.rate
	return false, retryAfter
}

func (l *Limiter) cleanup() {
	ticker := time.NewTicker(l.config.CleanupPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			l.mu.Lock()
			cutoff := time.Now().Add(-l.config.CleanupPeriod)
			for key, b := range l.buckets {
				if b.lastUpdate.Before(cutoff) {
					delete(l.buckets, key)
				}
			}
			l.mu.Unlock()
		case <-l.stop:
			return
		}
	}
}

func (l *Limiter) AllowGlobal(ip string) bool {
	if !l.config.Enabled {
		return true
	}
	if l.config.GlobalRate <= 0 {
		return true
	}
	key := "global:" + ip
	rate := float64(l.config.GlobalRate) / 60.0

	l.mu.Lock()
	defer l.mu.Unlock()

	b, exists := l.buckets[key]
	now := time.Now()

	if !exists {
		l.buckets[key] = &bucket{
			tokens:     float64(l.config.GlobalBurst) - 1,
			lastUpdate: now,
			rate:       rate,
			burst:      l.config.GlobalBurst,
		}
		return true
	}

	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.tokens += elapsed * b.rate
	if b.tokens > float64(b.burst) {
		b.tokens = float64(b.burst)
	}
	b.lastUpdate = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}