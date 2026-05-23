package voicechat

import (
	"sort"
	"sync"
	"time"

	"github.com/livekit/protocol/auth"
	"ror/modules/db"
	"ror/modules/websocket"
)

type Service struct {
	cfg                 Config
	DB                  *db.DB
	Hub                 *websocket.Hub
	DecryptUsernameByID func(userID string) string

	mu       sync.RWMutex
	presence map[string]map[string]struct{}
}

func NewService(cfg Config, dbConn *db.DB, hub *websocket.Hub) *Service {
	return &Service{
		cfg:      cfg,
		DB:       dbConn,
		Hub:      hub,
		presence: make(map[string]map[string]struct{}),
	}
}

func (s *Service) MintToken(userID, channelID, username string) (string, error) {
	at := auth.NewAccessToken(s.cfg.APIKey, s.cfg.APISecret)
	at.SetIdentity(userID)
	at.SetName(username)
	at.SetValidFor(time.Hour)
	at.SetVideoGrant(&auth.VideoGrant{
		RoomJoin: true,
		Room:     channelID,
	})
	return at.ToJWT()
}

func (s *Service) onJoin(channelID, userID string) {
	s.mu.Lock()
	set, ok := s.presence[channelID]
	if !ok {
		set = make(map[string]struct{})
		s.presence[channelID] = set
	}
	if _, exists := set[userID]; exists {
		s.mu.Unlock()
		return
	}
	set[userID] = struct{}{}
	s.mu.Unlock()
	s.broadcastChannel(channelID)
}

func (s *Service) onLeave(channelID, userID string) {
	s.mu.Lock()
	set, ok := s.presence[channelID]
	if !ok {
		s.mu.Unlock()
		return
	}
	if _, exists := set[userID]; !exists {
		s.mu.Unlock()
		return
	}
	delete(set, userID)
	if len(set) == 0 {
		delete(s.presence, channelID)
	}
	s.mu.Unlock()
	s.broadcastChannel(channelID)
}

func (s *Service) clearChannel(channelID string) {
	s.mu.Lock()
	_, existed := s.presence[channelID]
	delete(s.presence, channelID)
	s.mu.Unlock()
	if existed {
		s.broadcastChannel(channelID)
	}
}

func (s *Service) snapshotChannel(channelID string) []map[string]interface{} {
	s.mu.RLock()
	set := s.presence[channelID]
	if set == nil {
		s.mu.RUnlock()
		return []map[string]interface{}{}
	}
	ids := make([]string, 0, len(set))
	for id := range set {
		ids = append(ids, id)
	}
	s.mu.RUnlock()
	sort.Strings(ids)
	out := make([]map[string]interface{}, 0, len(ids))
	for _, id := range ids {
		name := id
		if s.DecryptUsernameByID != nil {
			if n := s.DecryptUsernameByID(id); n != "" {
				name = n
			}
		}
		out = append(out, map[string]interface{}{
			"user_id":  id,
			"username": name,
		})
	}
	return out
}

func (s *Service) snapshotAll() map[string][]map[string]interface{} {
	s.mu.RLock()
	channels := make([]string, 0, len(s.presence))
	for ch := range s.presence {
		channels = append(channels, ch)
	}
	s.mu.RUnlock()
	out := make(map[string][]map[string]interface{}, len(channels))
	for _, ch := range channels {
		out[ch] = s.snapshotChannel(ch)
	}
	return out
}

func (s *Service) broadcastChannel(channelID string) {
	if s.Hub == nil || s.DB == nil {
		return
	}
	payload := map[string]interface{}{
		"channel_id": channelID,
		"peers":      s.snapshotChannel(channelID),
	}
	guildID := s.DB.GetChannelGuildID(channelID)
	if guildID == "" {
		s.Hub.Emit("voicePeers", payload)
		return
	}
	s.Hub.EmitToGuild(guildID, "voicePeers", payload)
}