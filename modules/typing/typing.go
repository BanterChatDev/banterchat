package typing

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/websocket"
)

type typingPayload struct {
	ChannelID string `json:"channel_id"`
}

const typingExpiry = 6 * time.Second

type entry struct {
	Username string `json:"username"`
	expires  time.Time
}

type ChannelGuildResolver interface {
	GetChannelGuildID(channelID string) string
}

type Service struct {
	hub      *websocket.Hub
	users    interface{ ResolveDisplayName(userID, guildID string) string }
	channels ChannelGuildResolver
	mu       sync.Mutex
	state    map[string]map[string]*entry
}

func NewService(hub *websocket.Hub, users interface{ ResolveDisplayName(userID, guildID string) string }, channels ChannelGuildResolver) *Service {
	svc := &Service{
		hub:      hub,
		users:    users,
		channels: channels,
		state:    make(map[string]map[string]*entry),
	}
	hub.HandlePacketType("typing_start", svc.handleStart)
	hub.HandlePacketType("typing_stop", svc.handleStop)
	go svc.cleanup()
	return svc
}

func (s *Service) Start(userID, channelID string) {
	if channelID == "" {
		return
	}
	guildID := s.channels.GetChannelGuildID(channelID)
	username := s.users.ResolveDisplayName(userID, guildID)
	if username == "" {
		return
	}
	s.mu.Lock()
	if s.state[channelID] == nil {
		s.state[channelID] = make(map[string]*entry)
	}
	s.state[channelID][userID] = &entry{Username: username, expires: time.Now().Add(typingExpiry)}
	s.mu.Unlock()
	s.emitStart(channelID, userID, username)
}

func (s *Service) handleStart(userID string, raw json.RawMessage) {
	var p typingPayload
	if json.Unmarshal(raw, &p) != nil {
		return
	}
	s.Start(userID, p.ChannelID)
}

func (s *Service) handleStop(userID string, raw json.RawMessage) {
	var p typingPayload
	if json.Unmarshal(raw, &p) != nil || p.ChannelID == "" {
		return
	}
	s.mu.Lock()
	if ch, ok := s.state[p.ChannelID]; ok {
		delete(ch, userID)
		if len(ch) == 0 {
			delete(s.state, p.ChannelID)
		}
	}
	s.mu.Unlock()
	s.emitStop(p.ChannelID, userID)
}

func (s *Service) GetTypers(c echo.Context) error {
	channelID := c.Param("id")
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	result := map[string]string{}
	if ch, ok := s.state[channelID]; ok {
		for uid, e := range ch {
			if now.Before(e.expires) {
				result[uid] = e.Username
			}
		}
	}
	return c.JSON(200, result)
}

func (s *Service) cleanup() {
	ticker := time.NewTicker(3 * time.Second)
	type expired struct{ ch, uid string }
	for range ticker.C {
		now := time.Now()
		var toEmit []expired
		s.mu.Lock()
		for ch, users := range s.state {
			for uid, e := range users {
				if now.After(e.expires) {
					delete(users, uid)
					toEmit = append(toEmit, expired{ch, uid})
				}
			}
			if len(users) == 0 {
				delete(s.state, ch)
			}
		}
		s.mu.Unlock()
		for _, e := range toEmit {
			s.emitStop(e.ch, e.uid)
		}
	}
}