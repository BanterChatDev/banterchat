package messages

import (
	"encoding/json"
	"strings"

	"ror/modules/encryption"
)

func (s *Service) Edit(userID, messageID, content string) error {
	if messageID == "" {
		return ErrInvalidRequest
	}
	content = strings.TrimSpace(content)
	if content == "" {
		return ErrEmptyContent
	}
	if err := ValidateMessageContent(content, s.cfg); err != nil {
		return err
	}
	msg, err := s.getMessage(messageID)
	if err != nil {
		return ErrNotFound
	}
	if msg.UserID != userID {
		return ErrNotAllowed
	}
	if ids := ExtractEmojiIDs(content); len(ids) > 0 {
		channelGuildID := s.db.GetChannelGuildID(msg.ChannelID)
		for _, id := range ids {
			if !s.db.IsEmojiAllowedInGuild(id, channelGuildID) {
				return ErrNotAllowed
			}
		}
	}
	encContent, err := encryption.EncryptWithMaster(content, s.masterKey)
	if err != nil {
		return err
	}
	if err := s.updateMessage(messageID, encContent); err != nil {
		return err
	}
	s.emitEdit(messageID, msg.ChannelID, content)
	return nil
}

func (s *Service) HandleEdit(userID string, raw json.RawMessage) {
	var req struct {
		MessageID string `json:"message_id"`
		Content   string `json:"content"`
	}
	if json.Unmarshal(raw, &req) != nil {
		return
	}
	if err := s.Edit(userID, req.MessageID, req.Content); err != nil {
		if err == ErrNotAllowed {
			s.hub.SendError(userID, "forbidden", err.Error())
		}
	}
}