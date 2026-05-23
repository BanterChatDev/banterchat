package interactions

import (
	"encoding/json"
	"errors"

	"ror/modules/db"
	"ror/modules/messages"
)

var (
	ErrCommandNotFound  = errors.New("command not found")
	ErrNotAllowed       = errors.New("not allowed")
	ErrInteractionGone  = errors.New("interaction expired or unknown")
	ErrAlreadyResponded = errors.New("interaction already has an initial response")
	ErrInvalidRequest   = errors.New("invalid request")
)

type MessageSender interface {
	SendBotInteractionReply(botUserID, channelID, content string, embed json.RawMessage,
		rawComponents json.RawMessage,
		interactionID, ephemeralUserID, commandName, commandArgs, invokerID string,
		attachmentIDs []string, replyTo string) (*messages.Msg, error)
	Send(userID string, req messages.SendReq) (*messages.Msg, error)
	EncryptForStorage(plain string) (string, error)
	EmitUpdate(channelID string, payload map[string]interface{})
}

type InvokerInfo struct {
	ID        string
	Username  string
	AvatarID  string
	RoleColor string
}

type InvokerLookup func(userID, channelID string) InvokerInfo

type Emitter interface {
	EmitTo(userID, eventType string, payload interface{})
	EmitToChannel(channelID, eventType string, payload interface{})
}

type Service struct {
	db            *db.DB
	hub           Emitter
	send          MessageSender
	resolveInvoke InvokerLookup
}

func NewService(database *db.DB, hub Emitter, sender MessageSender, lookup InvokerLookup) *Service {
	return &Service{db: database, hub: hub, send: sender, resolveInvoke: lookup}
}

func (s *Service) lookupApp(botUserID string) (string, bool) {
	app, err := s.db.GetBotAppByBotUserID(botUserID)
	if err != nil || app == nil {
		return "", false
	}
	return app.ID, app.Verified
}

type InvokeReq struct {
	Command   string                 `json:"command"`
	BotUserID string                 `json:"bot_user_id"`
	ChannelID string                 `json:"channel_id"`
	GuildID   string                 `json:"guild_id"`
	Options   map[string]interface{} `json:"options"`
}

func (s *Service) notifyInteractionError(invokerUserID, kind, command string, err error) {
	if invokerUserID == "" {
		return
	}
	reason := "Action failed."
	switch {
	case errors.Is(err, ErrCommandNotFound):
		if kind == "slash" {
			reason = "That command isn't available here."
		} else {
			reason = "That action isn't available anymore."
		}
	case errors.Is(err, ErrNotAllowed):
		if kind == "slash" {
			reason = "You don't have permission to use that command."
		} else {
			reason = "You don't have permission to do that here."
		}
	case errors.Is(err, ErrInvalidRequest):
		reason = "Invalid request."
	case errors.Is(err, ErrInteractionGone):
		reason = "That interaction has expired."
	}
	s.emitError(invokerUserID, kind, command, reason)
}