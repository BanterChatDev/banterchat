package dms

import (
	"strconv"

	"github.com/labstack/echo/v4"
	"ror/modules/db"
	"ror/modules/messages"
	"ror/modules/websocket"
)

type Service struct {
	db      *db.DB
	hub     *websocket.Hub
	cfg     Config
	msgCfg  messages.Config
	Users interface {
		DecryptUsernameByID(string) string
	}
	GetAvatarByUserID func(string) string
	FetchMessages     func(channelID, before string, limit int, userID string) (interface{}, error)
}

func NewService(db *db.DB, hub *websocket.Hub, cfg Config, msgCfg messages.Config, users interface {
	DecryptUsernameByID(string) string
}) *Service {
	return &Service{db: db, hub: hub, cfg: cfg, msgCfg: msgCfg, Users: users}
}

func (s *Service) List(c echo.Context) error {
	if !s.cfg.Enabled {
		return c.JSON(200, echo.Map{"conversations": []interface{}{}})
	}
	userID := c.Get("userID").(string)
	convs, err := s.listConversations(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if convs == nil {
		convs = []Conversation{}
	}
	result := make([]echo.Map, len(convs))
	for i, conv := range convs {
		peerID := conv.User1ID
		if peerID == userID {
			peerID = conv.User2ID
		}
		peerName := s.Users.DecryptUsernameByID(peerID)
		avatarID := ""
		if s.GetAvatarByUserID != nil {
			avatarID = s.GetAvatarByUserID(peerID)
		}
		result[i] = echo.Map{
			"id":            conv.ID,
			"peer_id":       peerID,
			"peer_username": peerName,
			"peer_avatar":   avatarID,
			"peer_online":   s.hub.IsOnline(peerID),
			"created_at":    conv.CreatedAt,
		}
	}
	return c.JSON(200, echo.Map{"conversations": result})
}

func (s *Service) GetOrCreate(c echo.Context) error {
	if !s.cfg.Enabled {
		return c.JSON(403, echo.Map{"error": "direct messages are disabled"})
	}
	userID := c.Get("userID").(string)
	peerID := c.Param("peerId")
	if err := s.ValidatePeer(userID, peerID); err != nil {
		if err == ErrUserNotFound {
			return c.JSON(404, echo.Map{"error": err.Error()})
		}
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if !s.ValidateConversationLimit(userID) {
		return c.JSON(400, echo.Map{"error": "too many conversations"})
	}
	conv, err := s.getOrCreateConversation(userID, peerID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	peerName := s.Users.DecryptUsernameByID(peerID)
	avatarID := ""
	if s.GetAvatarByUserID != nil {
		avatarID = s.GetAvatarByUserID(peerID)
	}
	return c.JSON(200, echo.Map{
		"id":            conv.ID,
		"peer_id":       peerID,
		"peer_username": peerName,
		"peer_avatar":   avatarID,
		"created_at":    conv.CreatedAt,
	})
}

func (s *Service) ListMessages(c echo.Context) error {
	userID := c.Get("userID").(string)
	peerID := c.Param("peerId")
	if err := s.ValidatePeer(userID, peerID); err != nil {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	conv, err := s.getOrCreateConversation(userID, peerID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	before := c.QueryParam("before")
	around := c.QueryParam("around")
	limit := s.msgCfg.DefaultLimit
	if v := c.QueryParam("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= s.msgCfg.MaxLimit {
			limit = n
		}
	}
	_ = around
	if s.FetchMessages != nil {
		result, err := s.FetchMessages(conv.ID, before, limit, userID)
		if err != nil {
			return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
		}
		return c.JSON(200, result)
	}
	return c.JSON(200, echo.Map{"messages": []interface{}{}, "mentioned_users": map[string]interface{}{}})
}

func (s *Service) GetMembers(c echo.Context) error {
	userID := c.Get("userID").(string)
	peerID := c.Param("peerId")
	if err := s.ValidatePeer(userID, peerID); err != nil {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	u1, u2 := canonicalOrder(userID, peerID)
	if !s.db.ConversationExists(u1, u2) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	members := make([]echo.Map, 0, 2)
	for _, uid := range []string{userID, peerID} {
		name := s.Users.DecryptUsernameByID(uid)
		avatarID := ""
		if s.GetAvatarByUserID != nil {
			avatarID = s.GetAvatarByUserID(uid)
		}
		members = append(members, echo.Map{
			"id":        uid,
			"username":  name,
			"avatar_id": avatarID,
			"online":    s.hub.IsOnline(uid),
		})
	}
	return c.JSON(200, echo.Map{"users": members, "total": 2, "online_count": len(members)})
}

func (s *Service) Close(c echo.Context) error {
	userID := c.Get("userID").(string)
	peerID := c.Param("peerId")
	if err := s.ValidatePeer(userID, peerID); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	u1, u2 := canonicalOrder(userID, peerID)
	if !s.db.ConversationExists(u1, u2) {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	conv, err := s.getOrCreateConversation(userID, peerID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if err := s.db.CloseConversation(conv.ID, userID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitClosed(userID, conv.ID, peerID)
	return c.JSON(200, echo.Map{"ok": true})
}

func (s *Service) ReopenForUser(convID, userID string) {
	reopened, err := s.db.ReopenConversation(convID, userID)
	if err != nil || !reopened {
		return
	}
	conv, err := s.GetConversation(convID)
	if err != nil {
		return
	}
	peerID := conv.User1ID
	if peerID == userID {
		peerID = conv.User2ID
	}
	peerName := s.Users.DecryptUsernameByID(peerID)
	avatarID := ""
	if s.GetAvatarByUserID != nil {
		avatarID = s.GetAvatarByUserID(peerID)
	}
	s.emitReopened(userID, map[string]interface{}{
		"id":            conv.ID,
		"peer_id":       peerID,
		"peer_username": peerName,
		"peer_avatar":   avatarID,
		"peer_online":   s.hub.IsOnline(peerID),
		"created_at":    conv.CreatedAt,
	})
}

func (s *Service) ResolveDMPerms(userID, channelID string) (int64, bool) {
	if !s.IsParticipant(userID, channelID) {
		if s.IsDMChannel(channelID) {
			return 0, true
		}
		return 0, false
	}
	return s.buildDMPermBits(), true
}

func (s *Service) buildDMPermBits() int64 {
	var bits int64
	p := s.cfg.Perms
	if p.SendMessages {
		bits |= 1 << 0
	}
	if p.ViewChannels {
		bits |= 1 << 6
	}
	if p.AttachFiles {
		bits |= 1 << 7
	}
	if p.ManageMessages {
		bits |= 1 << 3
	}
	return bits
}