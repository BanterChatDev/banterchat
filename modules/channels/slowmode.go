package channels

import (
	"hash/fnv"
	"sync"
	"time"
)

const slowmodeShardCount = 256

type slowmodeShard struct {
	mu   sync.Mutex
	last map[string]map[string]int64
}

type SlowmodeTracker struct {
	shards [slowmodeShardCount]*slowmodeShard
}

func NewSlowmodeTracker() *SlowmodeTracker {
	t := &SlowmodeTracker{}
	for i := 0; i < slowmodeShardCount; i++ {
		t.shards[i] = &slowmodeShard{last: make(map[string]map[string]int64)}
	}
	go t.evictLoop()
	return t
}

func (t *SlowmodeTracker) shardFor(channelID string) *slowmodeShard {
	h := fnv.New32a()
	h.Write([]byte(channelID))
	return t.shards[h.Sum32()%slowmodeShardCount]
}

func (t *SlowmodeTracker) Check(channelID, userID string, slowmodeSeconds int) (allowed bool, retryAfter int) {
	if slowmodeSeconds <= 0 {
		return true, 0
	}
	now := time.Now().Unix()
	sh := t.shardFor(channelID)
	sh.mu.Lock()
	defer sh.mu.Unlock()
	users, ok := sh.last[channelID]
	if !ok {
		users = make(map[string]int64)
		sh.last[channelID] = users
	}
	last := users[userID]
	if last > 0 {
		elapsed := now - last
		if elapsed < int64(slowmodeSeconds) {
			return false, int(int64(slowmodeSeconds) - elapsed)
		}
	}
	users[userID] = now
	return true, 0
}

func (t *SlowmodeTracker) Reset(channelID string) {
	sh := t.shardFor(channelID)
	sh.mu.Lock()
	delete(sh.last, channelID)
	sh.mu.Unlock()
}

func (t *SlowmodeTracker) evictLoop() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		t.evictOnce()
	}
}

func (t *SlowmodeTracker) evictOnce() {
	cutoff := time.Now().Unix() - 6*60*60
	for _, sh := range t.shards {
		sh.mu.Lock()
		for cid, users := range sh.last {
			for uid, ts := range users {
				if ts < cutoff {
					delete(users, uid)
				}
			}
			if len(users) == 0 {
				delete(sh.last, cid)
			}
		}
		sh.mu.Unlock()
	}
}