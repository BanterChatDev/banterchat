package interactions

import (
	"encoding/json"
	"time"

	"ror/modules/db"
	"ror/modules/id"
	"ror/modules/permissions"
)

// InvokeButtonReq is the payload sent over WS when a user clicks a
// button on a bot message. Frontend builds this in MessageComponents.jsx.
type InvokeButtonReq struct {
	MessageID string `json:"message_id"`
	CustomID  string `json:"custom_id"`
	ChannelID string `json:"channel_id"`
	GuildID   string `json:"guild_id"`
}

// InvokeButton is the button-click counterpart to Invoke. Looks up the
// source message's owning bot, checks the invoker has PermSendMessages
// in the channel, creates a pending interaction row pointing at the
// source message, and dispatches interaction_create to the owning bot
// with type="button". Buttons aren't pre-registered — the bot routes
// clicks at runtime by custom_id pattern, like discord.py's persistent
// views.
func (s *Service) InvokeButton(invokerUserID string, req InvokeButtonReq) (*db.InteractionRow, error) {
	if req.MessageID == "" || req.CustomID == "" || req.ChannelID == "" {
		return nil, ErrInvalidRequest
	}
	msgID, chID, ownerID, _, _, _, _, _, _, _, _, _, _, _, err := s.db.GetMessageRow(req.MessageID)
	if err != nil || msgID == "" || ownerID == "" || chID != req.ChannelID {
		return nil, ErrCommandNotFound
	}
	appID, appVerified := s.lookupApp(ownerID)
	if appID == "" {
		return nil, ErrCommandNotFound
	}
	invokerPerms := permissions.ResolveChannelPerms(s.db, invokerUserID, req.ChannelID)
	if !permissions.HasPerm(invokerPerms, permissions.PermSendMessages) {
		return nil, ErrNotAllowed
	}
	now := time.Now().UTC()
	row := db.InteractionRow{
		ID:              id.Generate(),
		Token:           id.Generate() + id.Generate(),
		AppID:           appID,
		BotUserID:       ownerID,
		InvokerUserID:   invokerUserID,
		ChannelID:       req.ChannelID,
		GuildID:         req.GuildID,
		CommandName:     "__button__",
		OptionsJSON:     "{}",
		Status:          db.InteractionStatusPending,
		SourceMessageID: req.MessageID,
		CustomID:        req.CustomID,
		CreatedAt:       now,
		ExpiresAt:       now.Add(db.InteractionTTL),
	}
	if err := s.db.CreateInteraction(row); err != nil {
		return nil, err
	}
	s.emitCreate(ownerID, map[string]interface{}{
		"id":                row.ID,
		"interaction_id":    row.ID,
		"token":             row.Token,
		"app_id":            appID,
		"app_verified":      appVerified,
		"type":              "button",
		"custom_id":         req.CustomID,
		"message_id":        req.MessageID,
		"source_message_id": req.MessageID,
		"guild_id":          req.GuildID,
		"channel_id":        req.ChannelID,
		"user_id":           invokerUserID,
	})
	return &row, nil
}

// HandleButtonClick is the WS-packet handler for "button_click".
func (a *API) HandleButtonClick(userID string, raw json.RawMessage) {
	var req InvokeButtonReq
	if err := json.Unmarshal(raw, &req); err != nil {
		return
	}
	_, err := a.svc.InvokeButton(userID, req)
	if err != nil {
		a.svc.notifyInteractionError(userID, "button", "", err)
	}
}