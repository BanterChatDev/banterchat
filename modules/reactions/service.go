package reactions

import (
	"encoding/json"

	"ror/modules/db"
	"ror/modules/logger"
	"ror/modules/permissions"
	"ror/modules/websocket"
)

type Service struct {
	db              *db.DB
	hub             *websocket.Hub
	cfg             Config
	DecryptUsername func(string) string
}

func NewService(db *db.DB, hub *websocket.Hub, cfg Config) *Service {
	return &Service{db: db, hub: hub, cfg: cfg}
}

func (s *Service) AddReaction(userID, channelID, messageID, emojiID string) error {
	if messageID == "" || channelID == "" || emojiID == "" {
		return ErrInvalidRequest
	}
	perms := permissions.ResolveChannelPerms(s.db, userID, channelID)
	if !permissions.HasPerm(perms, permissions.PermViewChannels) {
		return ErrNotAllowed
	}
	channelGuildID := s.db.GetChannelGuildID(channelID)
	if !s.db.IsEmojiAllowedInGuild(emojiID, channelGuildID) {
		return ErrNotAllowed
	}
	if hasReacted(s.db, messageID, userID, emojiID) {
		return nil
	}
	if totalForMessage(s.db, messageID) >= s.cfg.MaxPerMessage {
		return ErrReactionLimit
	}
	if err := addReaction(s.db, messageID, userID, emojiID); err != nil {
		logger.Warn("reaction insert failed", "error", err, "message", messageID, "emoji", emojiID, "user", userID)
		return ErrInvalidRequest
	}
	s.db.BumpFreqEmoji(userID, emojiID)
	count := countForMessage(s.db, messageID, emojiID)
	name := ""
	if row, err := s.db.GetGuildEmoji(emojiID); err == nil && row != nil {
		name = row.Name
	}
	username := ""
	if s.DecryptUsername != nil {
		username = s.DecryptUsername(userID)
	}
	s.emitAdd(channelID, messageID, emojiID, name, userID, username, count)
	return nil
}

func (s *Service) RemoveReaction(userID, channelID, messageID, emojiID string) error {
	if messageID == "" || channelID == "" || emojiID == "" {
		return ErrInvalidRequest
	}
	if !hasReacted(s.db, messageID, userID, emojiID) {
		return nil
	}
	if err := removeReaction(s.db, messageID, userID, emojiID); err != nil {
		return err
	}
	count := countForMessage(s.db, messageID, emojiID)
	name := ""
	if row, err := s.db.GetGuildEmoji(emojiID); err == nil && row != nil {
		name = row.Name
	}
	username := ""
	if s.DecryptUsername != nil {
		username = s.DecryptUsername(userID)
	}
	s.emitRemove(channelID, messageID, emojiID, name, userID, username, count)
	return nil
}

func (s *Service) HandleAdd(userID string, raw json.RawMessage) {
	var req struct {
		MessageID string `json:"message_id"`
		ChannelID string `json:"channel_id"`
		EmojiID   string `json:"emoji_id"`
	}
	if json.Unmarshal(raw, &req) != nil {
		return
	}
	if err := s.AddReaction(userID, req.ChannelID, req.MessageID, req.EmojiID); err != nil {
		if err == ErrReactionLimit {
			s.hub.SendError(userID, "reaction_limit", "too many unique reactions on this message")
		}
	}
}

func (s *Service) HandleRemove(userID string, raw json.RawMessage) {
	var req struct {
		MessageID string `json:"message_id"`
		ChannelID string `json:"channel_id"`
		EmojiID   string `json:"emoji_id"`
	}
	if json.Unmarshal(raw, &req) != nil {
		return
	}
	_ = s.RemoveReaction(userID, req.ChannelID, req.MessageID, req.EmojiID)
}

func (s *Service) GetReactionsBatch(messageIDs []string, viewerID string) map[string]interface{} {
	batch := listForMessages(s.db, messageIDs, viewerID)
	out := make(map[string]interface{}, len(batch))
	for msgID, reactions := range batch {
		for i := range reactions {
			raw := getUsernamesForReaction(s.db, msgID, reactions[i].EmojiID, 3)
			if s.DecryptUsername != nil {
				for j := range raw {
					raw[j] = s.DecryptUsername(raw[j])
				}
			}
			if raw == nil {
				raw = []string{}
			}
			reactions[i].Users = raw
		}
		out[msgID] = reactions
	}
	return out
}

func (s *Service) DeleteByMessage(messageID string) {
	deleteByMessage(s.db, messageID)
}