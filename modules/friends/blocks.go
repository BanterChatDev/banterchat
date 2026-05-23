package friends

import (
	"errors"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/encryption"
	"ror/modules/id"
)

var (
	ErrCannotBlockSelf = errors.New("cannot block yourself")
	ErrAlreadyBlocked  = errors.New("already blocked")
)

func (s *Service) ListBlocks(c echo.Context) error {
	userID := c.Get("userID").(string)
	rows, _ := s.db.ListBlocks(userID)
	out := make([]echo.Map, 0, len(rows))
	for _, r := range rows {
		out = append(out, echo.Map{"id": r.ID, "user": s.userInfo(r.ToUserID), "created_at": r.CreatedAt})
	}
	return c.JSON(200, out)
}

// ListBlockedBy returns just the user IDs that have blocked the caller.
// The response is intentionally minimal — only a `user_ids` array — since
// the client only uses this to gate its own message input; it does not
// need to display who the blockers are.
func (s *Service) ListBlockedBy(c echo.Context) error {
	userID := c.Get("userID").(string)
	rows, _ := s.db.ListBlockedBy(userID)
	ids := make([]string, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.FromUserID)
	}
	return c.JSON(200, echo.Map{"user_ids": ids})
}

func (s *Service) resolveUsername(raw string) (string, error) {
	username := strings.TrimSpace(strings.ToLower(raw))
	if username == "" {
		return "", ErrUserNotFound
	}
	hash := encryption.HashIdentifier(username, s.masterKey)
	u, err := s.db.GetUserByUsernameHash(hash)
	if err != nil {
		return "", ErrUserNotFound
	}
	return u.ID, nil
}

func (s *Service) BlockUser(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Username string `json:"username"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	targetID, err := s.resolveUsername(req.Username)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	if targetID == userID {
		return c.JSON(400, echo.Map{"error": ErrCannotBlockSelf.Error()})
	}
	s.db.DeleteAnyRelation(userID, targetID)
	blockID := id.Generate()
	if err := s.db.InsertBlock(blockID, userID, targetID); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return c.JSON(409, echo.Map{"error": ErrAlreadyBlocked.Error()})
		}
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	s.emitBlockAdd(userID, blockID, s.userInfo(targetID))
	s.emitPeerBlocked(targetID, userID)
	s.emitRemoved(userID, map[string]interface{}{"peer_id": targetID})
	s.emitRemoved(targetID, map[string]interface{}{"peer_id": userID})
	return c.JSON(200, echo.Map{"message": "blocked"})
}

func (s *Service) UnblockUser(c echo.Context) error {
	userID := c.Get("userID").(string)
	targetID, err := s.resolveUsername(c.Param("username"))
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	if err := s.db.DeleteBlock(userID, targetID); err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	s.emitBlockRemove(userID, targetID)
	s.emitPeerUnblocked(targetID, userID)
	return c.JSON(200, echo.Map{"message": "unblocked"})
}	