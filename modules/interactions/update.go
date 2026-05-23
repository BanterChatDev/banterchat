package interactions

import (
	"encoding/json"

	"ror/modules/db"
	"ror/modules/logger"
	"ror/modules/messages"
)

// applyUpdate implements KindUpdate: edits the source message in place
// with new content/embed/components. Only valid for button interactions
// (caller has verified SourceMessageID != ""). The bot must own the
// message it's updating — a button click dispatches to the message's
// owning bot, so by the time we reach here the interaction is authz'd,
// but we re-verify ownership in case the message was transferred/deleted
// between dispatch and response.
//
// Semantics (match Discord's behavior):
//   - content=""        → keep existing content
//   - embed missing     → keep existing embed
//   - components missing → keep existing components
//   - components=[]     → clear all buttons (send empty array to remove)
//
// The emit is always "message_update" to the channel so every viewer
// sees the new state live — it doesn't set `edited:true` because a
// button-driven update isn't an author edit.
func (s *Service) applyUpdate(row *db.InteractionRow, req RespondReq) error {
	msgID := row.SourceMessageID
	_, _, ownerID, _, _, _, _, _, _, _, _, _, _, _, err := s.db.GetMessageRow(msgID)
	if err != nil || ownerID != row.BotUserID {
		logger.Warn("interactions.applyUpdate ownership check failed",
			"msg_id", msgID, "owner_id", ownerID, "bot_user_id", row.BotUserID,
			"interaction_id", row.ID, "db_err", err)
		return ErrInvalidRequest
	}
	if req.Content != "" {
		encContent, eerr := s.send.EncryptForStorage(req.Content)
		if eerr != nil {
			return eerr
		}
		if uerr := s.db.UpdateMessageContentOnly(msgID, encContent); uerr != nil {
			return uerr
		}
	}
	if len(req.Embed) > 0 {
		encEmbed := string(req.Embed)
		if enc, eerr := s.send.EncryptForStorage(string(req.Embed)); eerr == nil {
			encEmbed = enc
		}
		if uerr := s.db.UpdateMessageEmbed(msgID, encEmbed); uerr != nil {
			return uerr
		}
	}
	canonicalComponents := ""
	if len(req.Components) > 0 {
		c, verr := messages.ValidateComponents(req.Components)
		if verr != nil {
			return ErrInvalidRequest
		}
		canonicalComponents = c
	}
	if uerr := s.db.UpdateMessageComponents(msgID, canonicalComponents); uerr != nil {
		return uerr
	}
	payload := map[string]interface{}{
		"id":         msgID,
		"channel_id": row.ChannelID,
		"guild_id":   row.GuildID,
		"content":    req.Content,
	}
	if len(req.Embed) > 0 {
		payload["embed"] = json.RawMessage(req.Embed)
	}
	if canonicalComponents != "" {
		payload["components"] = json.RawMessage(canonicalComponents)
	} else {
		payload["components"] = json.RawMessage("null")
	}
	s.send.EmitUpdate(row.ChannelID, payload)
	logger.Info("interactions.applyUpdate success",
		"msg_id", msgID, "bot_user_id", row.BotUserID, "interaction_id", row.ID,
		"content_len", len(req.Content), "embed_len", len(req.Embed),
		"components_len", len(canonicalComponents))
	return nil
}