package messages

import (
	"encoding/json"

	"github.com/labstack/echo/v4"
	"ror/modules/permissions"
)

func (s *Service) HandleDelete(userID string, raw json.RawMessage) {
	var req struct {
		MessageID string `json:"message_id"`
		ChannelID string `json:"channel_id"`
	}
	if json.Unmarshal(raw, &req) != nil || req.MessageID == "" || req.ChannelID == "" {
		return
	}
	if err := s.DeleteMessageByID(req.MessageID, userID, false); err != nil {
		if err == ErrNotAllowed {
			s.hub.SendError(userID, "forbidden", err.Error())
		}
	}
}

func (s *Service) DeleteMessageByID(messageID, actorID string, force bool) error {
	channelID, authorID, systemType, metaJSON, err := s.db.GetMessageAuthz(messageID)
	if err != nil {
		return err
	}
	if !force {
		effectivePerms := permissions.ResolveChannelPerms(s.db, actorID, channelID)
		canManage := permissions.HasPerm(effectivePerms, permissions.PermManageMessages)
		ownerID := authorID
		if ownerID == "" && systemType != "" {
			ownerID = systemMessageSubject(metaJSON)
		}
		if ownerID != actorID && !canManage {
			return ErrNotAllowed
		}
	}
	if s.DeleteAttachments != nil {
		s.DeleteAttachments(messageID)
	}
	if s.DeleteReactions != nil {
		s.DeleteReactions(messageID)
	}
	if err := s.deleteMessage(messageID); err != nil {
		return err
	}
	s.emitDelete(messageID, channelID)
	return nil
}

// systemMessageSubject extracts the subject user_id from a system
// message's meta JSON. Returns "" if meta is empty or unparseable —
// caller treats that as "no subject, only mods can delete".
func systemMessageSubject(metaJSON string) string {
	if metaJSON == "" {
		return ""
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(metaJSON), &m); err != nil {
		return ""
	}
	if uid, _ := m["user_id"].(string); uid != "" {
		return uid
	}
	return ""
}

func (s *Service) PurgeByChannel(channelID string, count int) int {
	ids, err := s.db.ListMessageIDsByChannel(channelID, count)
	if err != nil {
		return 0
	}
	for _, id := range ids {
		if s.DeleteAttachments != nil {
			s.DeleteAttachments(id)
		}
		s.deleteMessage(id)
	}
	if len(ids) > 0 {
		s.emitDeleteBulk(ids, channelID)
	}
	return len(ids)
}

func (s *Service) PurgeHandler(c echo.Context) error {
	channelID := c.Param("id")
	var req struct {
		Limit int `json:"limit"`
	}
	_ = c.Bind(&req)
	if req.Limit <= 0 {
		req.Limit = 100
	}
	if req.Limit > 1000 {
		req.Limit = 1000
	}
	n := s.PurgeByChannel(channelID, req.Limit)
	return c.JSON(200, echo.Map{"deleted": n})
}