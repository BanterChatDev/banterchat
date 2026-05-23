package interactions

import (
	"encoding/json"
	"fmt"
	"time"

	"ror/modules/db"
	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/permissions"
)

func (s *Service) Invoke(invokerUserID string, req InvokeReq) (*db.InteractionRow, error) {
	req.Command = trimCommand(req.Command)
	if req.Command == "" || req.ChannelID == "" {
		logger.Warn("interactions.invoke deny", "reason", "invalid_request", "invoker", invokerUserID, "command", req.Command, "channel", req.ChannelID)
		return nil, ErrInvalidRequest
	}
	var cmd *db.BotCommandRow
	var err error
	if req.BotUserID != "" {
		cmd, err = s.db.GetGuildCommandByBotAndName(req.BotUserID, req.GuildID, req.Command)
	} else {
		cmd, err = s.db.GetGuildCommandByName(req.GuildID, req.Command)
	}
	if err != nil {
		logger.Warn("interactions.invoke deny", "reason", "command_not_found", "invoker", invokerUserID, "guild", req.GuildID, "bot", req.BotUserID, "command", req.Command, "error", err)
		return nil, ErrCommandNotFound
	}
	appID, appVerified := s.lookupApp(cmd.BotUserID)
	invokerPerms := permissions.ResolveChannelPerms(s.db, invokerUserID, req.ChannelID)
	if !permissions.HasPerm(invokerPerms, permissions.PermUseSlashCommands) {
		logger.Warn("interactions.invoke deny", "reason", "invoker_no_slash_perm", "invoker", invokerUserID, "channel", req.ChannelID, "computed_perms", fmt.Sprintf("0x%x", invokerPerms))
		return nil, ErrNotAllowed
	}
	botPerms := permissions.ResolveChannelPerms(s.db, cmd.BotUserID, req.ChannelID)
	if !permissions.HasPerm(botPerms, permissions.PermSendMessages) {
		logger.Warn("interactions.invoke deny", "reason", "bot_no_send_perm", "bot", cmd.BotUserID, "channel", req.ChannelID, "bot_is_member", s.db.IsGuildMember(req.GuildID, cmd.BotUserID), "computed_perms", fmt.Sprintf("0x%x", botPerms))
		return nil, ErrNotAllowed
	}
	logger.Info("interactions.invoke allow", "invoker", invokerUserID, "bot", cmd.BotUserID, "command", req.Command)
	optsJSON, err := json.Marshal(req.Options)
	if err != nil {
		logger.Error("interactions.invoke options marshal failed", "command", req.Command, "error", err)
		return nil, ErrInvalidRequest
	}
	if len(optsJSON) > 64*1024 {
		logger.Warn("interactions.invoke options too large", "command", req.Command, "size", len(optsJSON))
		return nil, ErrInvalidRequest
	}
	now := time.Now().UTC()
	row := db.InteractionRow{
		ID:            id.Generate(),
		Token:         id.Generate() + id.Generate(),
		AppID:         appID,
		BotUserID:     cmd.BotUserID,
		InvokerUserID: invokerUserID,
		ChannelID:     req.ChannelID,
		GuildID:       req.GuildID,
		CommandName:   req.Command,
		OptionsJSON:   string(optsJSON),
		Status:        db.InteractionStatusPending,
		CreatedAt:     now,
		ExpiresAt:     now.Add(db.InteractionTTL),
	}
	if err := s.db.CreateInteraction(row); err != nil {
		logger.Error("interactions.invoke create failed", "invoker", invokerUserID, "bot", cmd.BotUserID, "command", req.Command, "error", err)
		return nil, err
	}
	s.emitThinking(&row, req.Options, appVerified)
	s.emitCreate(cmd.BotUserID, map[string]interface{}{
		"id":             row.ID,
		"interaction_id": row.ID,
		"token":          row.Token,
		"app_id":         appID,
		"app_verified":   appVerified,
		"type":           "slash",
		"command_name":   req.Command,
		"options":        req.Options,
		"guild_id":       req.GuildID,
		"channel_id":     req.ChannelID,
		"user_id":        invokerUserID,
	})
	return &row, nil
}

// emitThinking broadcasts the transient "bot is thinking..." card
// shown between Invoke and the bot's first reply. For buttons we skip
// this — the clicked button disables itself and the perceived latency
// is in the hands of the bot's update/reply responsiveness instead.
func (s *Service) emitThinking(row *db.InteractionRow, options map[string]interface{}, appVerified bool) {
	invoker := s.resolveInvoke(row.InvokerUserID, row.ChannelID)
	payload := map[string]interface{}{
		"thinking":           true,
		"nonce":              row.ID,
		"interaction_id":     row.ID,
		"app_id":             row.AppID,
		"app_verified":       appVerified,
		"channel_id":         row.ChannelID,
		"command":            row.CommandName,
		"args":               formatArgsForDisplay(options),
		"user_id":            row.BotUserID,
		"username":           "",
		"is_bot":             true,
		"ephemeral":          row.Ephemeral,
		"invoker_id":         invoker.ID,
		"invoker_username":   invoker.Username,
		"invoker_avatar":     invoker.AvatarID,
		"invoker_role_color": invoker.RoleColor,
	}
	s.emitReply(row.ChannelID, row.InvokerUserID, row.Ephemeral, payload)
}

func trimCommand(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t') {
		s = s[:len(s)-1]
	}
	return s
}