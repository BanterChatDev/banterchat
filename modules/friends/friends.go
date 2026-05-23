package friends

import (
	"errors"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/id"
	"ror/modules/websocket"
)

var (
	ErrAlreadyFriends = errors.New("already friends or request pending")
	ErrSelfRequest    = errors.New("cannot friend yourself")
	ErrUserNotFound   = errors.New("user not found")
	ErrNotFound       = errors.New("friend request not found")
)

type Service struct {
	db        *db.DB
	hub       *websocket.Hub
	masterKey string
	DecryptUsernameByID func(string) string
	GetAvatarByUserID   func(string) string
	GetFlairByUserID    func(string) string
}

func NewService(db *db.DB, hub *websocket.Hub, masterKey string) *Service {
	return &Service{db: db, hub: hub, masterKey: masterKey}
}

func (s *Service) userInfo(uid string) echo.Map {
	name := ""
	if s.DecryptUsernameByID != nil {
		name = s.DecryptUsernameByID(uid)
	}
	avatar := ""
	if s.GetAvatarByUserID != nil {
		avatar = s.GetAvatarByUserID(uid)
	}
	flair := ""
	if s.GetFlairByUserID != nil {
		flair = s.GetFlairByUserID(uid)
	}
	online := false
	if s.hub != nil {
		online = s.hub.IsOnline(uid)
	}
	return echo.Map{"id": uid, "username": name, "avatar_id": avatar, "flair": flair, "online": online}
}

func (s *Service) SendRequest(c echo.Context) error {
	fromID := c.Get("userID").(string)
	var req struct {
		Username string `json:"username"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	username := strings.TrimSpace(strings.ToLower(req.Username))
	if username == "" {
		return c.JSON(400, echo.Map{"error": "username is required"})
	}
	usernameHash := encryption.HashIdentifier(username, s.masterKey)
	toUser, err := s.db.GetUserByUsernameHash(usernameHash)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	if toUser.ID == fromID {
		return c.JSON(400, echo.Map{"error": ErrSelfRequest.Error()})
	}
	if s.db.IsBlockedEitherWay(fromID, toUser.ID) {
		return c.JSON(403, echo.Map{"error": ErrUserNotFound.Error()})
	}
	existing, _ := s.db.GetFriendPair(fromID, toUser.ID)
	if existing != nil {
		return c.JSON(409, echo.Map{"error": ErrAlreadyFriends.Error()})
	}
	reqID := id.Generate()
	if err := s.db.InsertFriendRequest(reqID, fromID, toUser.ID); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return c.JSON(409, echo.Map{"error": ErrAlreadyFriends.Error()})
		}
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	s.emitRequest(toUser.ID, map[string]interface{}{
		"id": reqID, "from": s.userInfo(fromID), "created_at": "",
	})
	s.emitRequest(fromID, map[string]interface{}{
		"id": reqID, "to": s.userInfo(toUser.ID), "created_at": "",
	})
	return c.JSON(200, echo.Map{"message": "friend request sent"})
}

func (s *Service) AcceptRequest(c echo.Context) error {
	userID := c.Get("userID").(string)
	reqID := c.Param("id")
	row, err := s.db.GetFriendByID(reqID)
	if err != nil || row.ToUserID != userID || row.Status != "pending" {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	if err := s.db.AcceptFriend(reqID); err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	s.emitAccepted(row.FromUserID, map[string]interface{}{
		"id": reqID, "user": s.userInfo(userID),
	})
	s.emitAccepted(userID, map[string]interface{}{
		"id": reqID, "user": s.userInfo(row.FromUserID),
	})
	return c.JSON(200, echo.Map{"message": "accepted"})
}

func (s *Service) DeclineOrRemove(c echo.Context) error {
	userID := c.Get("userID").(string)
	reqID := c.Param("id")
	row, err := s.db.GetFriendByID(reqID)
	if err != nil || (row.FromUserID != userID && row.ToUserID != userID) {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	otherID := row.FromUserID
	if otherID == userID {
		otherID = row.ToUserID
	}
	if err := s.db.DeleteFriend(reqID); err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	s.emitRemoved(otherID, map[string]interface{}{"id": reqID})
	s.emitRemoved(userID, map[string]interface{}{"id": reqID})
	return c.JSON(200, echo.Map{"message": "removed"})
}

func (s *Service) ListFriends(c echo.Context) error {
	userID := c.Get("userID").(string)
	accepted, _ := s.db.ListFriends(userID, "accepted")
	pending, _ := s.db.ListPendingIncoming(userID)
	outgoing, _ := s.db.ListFriends(userID, "pending")

	friends := make([]echo.Map, 0)
	for _, r := range accepted {
		peerID := r.FromUserID
		if peerID == userID { peerID = r.ToUserID }
		friends = append(friends, echo.Map{"id": r.ID, "user": s.userInfo(peerID)})
	}

	incoming := make([]echo.Map, 0)
	for _, r := range pending {
		incoming = append(incoming, echo.Map{"id": r.ID, "from": s.userInfo(r.FromUserID), "created_at": r.CreatedAt})
	}

	sent := make([]echo.Map, 0)
	for _, r := range outgoing {
		if r.FromUserID == userID {
			sent = append(sent, echo.Map{"id": r.ID, "to": s.userInfo(r.ToUserID), "created_at": r.CreatedAt})
		}
	}

	return c.JSON(200, echo.Map{"friends": friends, "incoming": incoming, "outgoing": sent})
}