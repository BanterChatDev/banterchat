package interactions

import (
	"encoding/json"
	"time"

	"ror/modules/db"
	"ror/modules/messages"
)

const (
	KindReply    = "reply"
	KindDefer    = "defer"
	KindFollowup = "followup"
	KindUpdate   = "update"
)

type RespondReq struct {
	Kind       string          `json:"kind"`
	Content    string          `json:"content"`
	Embed      json.RawMessage `json:"embed"`
	Components json.RawMessage `json:"components,omitempty"`
	Ephemeral  bool            `json:"ephemeral"`
	ReplyTo    string          `json:"reply_to,omitempty"`
}

// Respond is the interaction-reply dispatcher. One entry point, four
// kinds: reply (initial response), defer (ack, fill in later),
// followup (additional messages after the initial reply), update
// (button-only: edit the source message). Each path has its own
// state-machine gating so a confused bot can't go reply→reply or
// followup-without-reply.
func (s *Service) Respond(botUserID, interactionID, token string, req RespondReq) (string, error) {
	row, err := s.db.GetInteraction(interactionID)
	if err != nil {
		return "", ErrInteractionGone
	}
	if row.Token != token || row.BotUserID != botUserID {
		return "", ErrInteractionGone
	}
	if time.Now().After(row.ExpiresAt) || row.Status == db.InteractionStatusExpired {
		return "", ErrInteractionGone
	}

	switch req.Kind {
	case KindDefer:
		if row.Status != db.InteractionStatusPending {
			return "", ErrAlreadyResponded
		}
		if err := s.db.UpdateInteractionStatus(interactionID, db.InteractionStatusDeferred); err != nil {
			return "", err
		}
		if req.Ephemeral {
			_ = s.updateEphemeralFlag(interactionID)
		}
		return "", nil

	case KindReply:
		if row.Status == db.InteractionStatusResponded {
			return "", ErrAlreadyResponded
		}
		msg, merr := s.persistAndEmit(row, req)
		if merr != nil {
			return "", merr
		}
		if err := s.db.UpdateInteractionStatus(interactionID, db.InteractionStatusResponded); err != nil {
			return msg.ID, err
		}
		return msg.ID, nil

	case KindFollowup:
		if row.Status != db.InteractionStatusResponded && row.Status != db.InteractionStatusDeferred {
			return "", ErrAlreadyResponded
		}
		return s.handleFollowup(row, req)

	case KindUpdate:
		if row.SourceMessageID == "" {
			return "", ErrInvalidRequest
		}
		if err := s.applyUpdate(row, req); err != nil {
			return "", err
		}
		if err := s.db.UpdateInteractionStatus(interactionID, db.InteractionStatusResponded); err != nil {
			return row.SourceMessageID, err
		}
		return row.SourceMessageID, nil

	default:
		return "", ErrInvalidRequest
	}
}

func (s *Service) updateEphemeralFlag(id string) error {
	_, err := s.db.Exec(`UPDATE interactions SET ephemeral = TRUE WHERE id = $1`, id)
	return err
}

func (s *Service) persistAndEmit(row *db.InteractionRow, req RespondReq) (*messages.Msg, error) {
	if req.Content == "" && len(req.Embed) == 0 {
		return nil, ErrInvalidRequest
	}
	ephemeralUserID := ""
	if req.Ephemeral {
		ephemeralUserID = row.InvokerUserID
	}
	msg, err := s.send.SendBotInteractionReply(
		row.BotUserID, row.ChannelID, req.Content, req.Embed,
		req.Components,
		row.ID, ephemeralUserID,
		row.CommandName, argsFromJSON(row.OptionsJSON), row.InvokerUserID,
		nil, req.ReplyTo,
	)
	if err != nil {
		return nil, err
	}
	invoker := s.resolveInvoke(row.InvokerUserID, row.ChannelID)
	_, appVerified := s.lookupApp(row.BotUserID)
	payload, perr := msgToMap(msg)
	if perr != nil {
		return msg, perr
	}
	payload["app_id"] = row.AppID
	payload["app_verified"] = appVerified
	payload["ephemeral"] = req.Ephemeral
	payload["nonce"] = row.ID
	payload["invoker_username"] = invoker.Username
	payload["invoker_avatar"] = invoker.AvatarID
	payload["invoker_role_color"] = invoker.RoleColor
	payload["command"] = row.CommandName
	payload["args"] = argsFromJSON(row.OptionsJSON)
	s.emitReply(row.ChannelID, row.InvokerUserID, req.Ephemeral, payload)
	return msg, nil
}

func msgToMap(m *messages.Msg) (map[string]interface{}, error) {
	raw, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// handleFollowup sends a followup message. Non-ephemeral goes through
// messages.Send — same code path bot.send_message uses, gives us
// created_at, reply hydration, attachments, perm checks, slowmode,
// and the right WS event ("channel_message") for free.
//
// Ephemeral followups bypass DB persistence (rule: ephemerals vanish
// on reload). For those we go through SendBotInteractionReply in
// ephemeral mode and emit channel_message to the invoker only —
// frontend treats it like any other ephemeral bot message.
func (s *Service) handleFollowup(row *db.InteractionRow, req RespondReq) (string, error) {
	if req.Content == "" && len(req.Embed) == 0 {
		return "", ErrInvalidRequest
	}
	if !req.Ephemeral {
		msg, err := s.send.Send(row.BotUserID, messages.SendReq{
			ChannelID:  row.ChannelID,
			Content:    req.Content,
			Embed:      req.Embed,
			Components: req.Components,
			ReplyTo:    req.ReplyTo,
			IsBot:      true,
		})
		if err != nil {
			return "", err
		}
		return msg.ID, nil
	}
	// Ephemeral followup: identity-resolve + emit, no DB. Build the
	// payload from the in-memory *Msg the same way persistAndEmit does,
	// then emit channel_message to just the invoker.
	msg, err := s.send.SendBotInteractionReply(
		row.BotUserID, row.ChannelID, req.Content, req.Embed,
		req.Components,
		row.ID, row.InvokerUserID,
		"", "", "",
		nil, req.ReplyTo,
	)
	if err != nil {
		return "", err
	}
	_, appVerified := s.lookupApp(row.BotUserID)
	payload, perr := msgToMap(msg)
	if perr != nil {
		return msg.ID, perr
	}
	payload["app_id"] = row.AppID
	payload["app_verified"] = appVerified
	payload["ephemeral"] = true
	s.hub.EmitTo(row.InvokerUserID, "channel_message", payload)
	return msg.ID, nil
}