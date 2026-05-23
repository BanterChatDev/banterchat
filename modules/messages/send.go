package messages

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"ror/modules/db"
	"ror/modules/embed"
	"ror/modules/encryption"
	"ror/modules/id"
	"ror/modules/permissions"
)

type SendReq struct {
	ChannelID     string          `json:"channel_id"`
	Content       string          `json:"content"`
	Type          string          `json:"type,omitempty"`
	Flags         int64           `json:"flags,omitempty"`
	Meta          json.RawMessage `json:"meta,omitempty"`
	AttachmentID  string          `json:"attachment_id"`
	AttachmentIDs []string        `json:"attachment_ids"`
	ReplyTo       string          `json:"reply_to"`
	Embed         json.RawMessage `json:"embed,omitempty"`
	Components    json.RawMessage `json:"components,omitempty"`
	MessageID     string          `json:"message_id,omitempty"`
	IsBot         bool            `json:"-"`
}

func (s *Service) SendAsWebhook(channelID, webhookID, displayName, avatarID, avatarURL, content string, embeds []embed.Embed, tts bool, attachmentIDs []string) (string, error) {
	content = strings.TrimSpace(content)
	if content == "" && len(embeds) == 0 && len(attachmentIDs) == 0 {
		return "", ErrInvalidRequest
	}
	if err := ValidateMessageContent(content, s.cfg); err != nil {
		return "", err
	}

	msgID := id.Generate()
	now := time.Now().UTC().Format(time.RFC3339)

	encContent, err := encryption.EncryptWithMaster(content, s.masterKey)
	if err != nil {
		return "", err
	}

	encEmbed := ""
	if len(embeds) > 0 {
		raw, merr := json.Marshal(embeds[0])
		if merr != nil {
			return "", ErrInvalidRequest
		}
		_, canonical, perr := embed.ParseAndValidate(raw, embed.LimitsFrom(s.embedCfg))
		if perr != nil {
			return "", ErrInvalidRequest
		}
		if canonical != "" {
			if enc, eerr := encryption.EncryptWithMaster(canonical, s.masterKey); eerr == nil {
				encEmbed = enc
			} else {
				encEmbed = canonical
			}
		}
	}

	metaBytes, _ := json.Marshal(map[string]string{
		"webhook_id":         webhookID,
		"webhook_name":       displayName,
		"webhook_avatar_id":  avatarID,
		"webhook_avatar_url": avatarURL,
	})

	if err := s.db.InsertMessageRow(db.MessageRow{
		ID:          msgID,
		GuildID:     s.db.GetChannelGuildID(channelID),
		ChannelID:   channelID,
		UserID:      "",
		Content:     encContent,
		Type:        "webhook",
		EmbedData:   encEmbed,
		AuthorPerms: 0,
		CreatedAt:   now,
		Meta:        string(metaBytes),
	}); err != nil {
		return "", err
	}

	if s.LinkAttachment != nil {
		for _, aid := range attachmentIDs {
			s.LinkAttachment(aid, msgID)
		}
	}
	atts := []MsgAttachment{}
	if s.GetAttachments != nil && len(attachmentIDs) > 0 {
		atts = s.GetAttachments(msgID)
	}
	if atts == nil {
		atts = []MsgAttachment{}
	}
	msg := &Msg{
		ID:          msgID,
		ChannelID:   channelID,
		UserID:      "",
		Username:    displayName,
		DisplayName: displayName,
		AvatarID:    avatarID,
		AvatarURL:   avatarURL,
		Content:     content,
		Type:        "webhook",
		CreatedAt:   now,
		AuthorPerms: 0,
		Meta:        json.RawMessage(metaBytes),
		Attachments: atts,
	}
	s.stampGuild(msg)
	s.emitChannelMessage(channelID, msg)
	return msgID, nil
}

func (s *Service) Send(userID string, req SendReq) (*Msg, error) {
	req.Content = strings.TrimSpace(req.Content)
	allAttIDs := req.AttachmentIDs
	if req.AttachmentID != "" {
		allAttIDs = append(allAttIDs, req.AttachmentID)
	}
	if req.Content == "" && len(allAttIDs) == 0 && len(req.Embed) == 0 {
		return nil, ErrInvalidRequest
	}
	if req.ChannelID == "" {
		return nil, ErrInvalidRequest
	}
	if err := ValidateVoiceSend(&req, len(allAttIDs)); err != nil {
		return nil, err
	}
	isVoice := req.Flags&FlagVoiceMessage != 0
	if err := ValidateMessageContent(req.Content, s.cfg); err != nil {
		return nil, err
	}
	if ids := ExtractEmojiIDs(req.Content); len(ids) > 0 {
		channelGuildID := s.db.GetChannelGuildID(req.ChannelID)
		for _, id := range ids {
			if !s.db.IsEmojiAllowedInGuild(id, channelGuildID) {
				return nil, ErrNotAllowed
			}
		}
	}
	effectivePerms := permissions.ResolveChannelPerms(s.db, userID, req.ChannelID)
	isDM := permissions.IsDM(userID, req.ChannelID)
	if !permissions.HasPerm(effectivePerms, permissions.PermSendMessages) {
		return nil, ErrNotAllowed
	}
	isThread := s.db.GetChannelType(req.ChannelID) == "thread"
	if isThread && !permissions.HasPerm(effectivePerms, permissions.PermSendInThreads) {
		return nil, ErrNotAllowed
	}
	if isDM && s.CanSendDM != nil {
		if ok, reason := s.CanSendDM(userID, req.ChannelID); !ok {
			return nil, &SendBlockedErr{Reason: reason}
		}
	}
	if !isDM && s.CheckSlowmode != nil {
		if ok, retryAfter := s.CheckSlowmode(req.ChannelID, userID, effectivePerms); !ok {
			return nil, &SlowmodeErr{RetryAfter: retryAfter}
		}
	}
	if len(allAttIDs) > 0 && !permissions.HasPerm(effectivePerms, permissions.PermAttachFiles) {
		return nil, ErrNotAllowed
	}
	if len(allAttIDs) > s.attCfg.MaxFileCount {
		return nil, fmt.Errorf("too many attachments (max %d)", s.attCfg.MaxFileCount)
	}
	if isDM && s.GetDMParticipants != nil && s.StripDMMentions != nil {
		if u1, u2, ok := s.GetDMParticipants(req.ChannelID); ok {
			req.Content = s.StripDMMentions(req.Content, u1, u2)
		}
	}
	encContent, err := encryption.EncryptWithMaster(req.Content, s.masterKey)
	if err != nil {
		return nil, err
	}
	var msg *Msg
	if isVoice {
		msg, err = s.createMessageTyped(req.ChannelID, userID, encContent, req.ReplyTo, effectivePerms, "user", "", FlagVoiceMessage)
	} else {
		msg, err = s.createMessage(req.ChannelID, userID, encContent, req.ReplyTo, effectivePerms)
	}
	if err != nil {
		return nil, err
	}
	if err := s.finalizeMessage(msg, req.Content, req.Embed, req.Components, allAttIDs, req.IsBot, isDM, isThread); err != nil {
		return nil, err
	}
	s.emitChannelMessage(msg.ChannelID, msg)
	if s.OnNotify != nil {
		go s.OnNotify(msg.ChannelID, msg.UserID, msg.Content, msg.AuthorPerms, msg.ReplyTo)
	}
	return msg, nil
}

func (s *Service) finalizeMessage(msg *Msg, plainContent string, rawEmbed, rawComponents json.RawMessage, attachmentIDs []string, callerIsBot, isDM, isThread bool) error {
	return s.finalizeMessageOpts(msg, plainContent, rawEmbed, rawComponents, attachmentIDs, callerIsBot, isDM, isThread, true)
}

// attachmentFilenameMap returns lowercased-filename -> attachment ID for the
// given attachment IDs, used to resolve `attachment://name.ext` references
// inside embeds. Returns nil if no IDs match. Filenames collide first-wins
// (matching the order the bot passed in attachment_ids).
func (s *Service) attachmentFilenameMap(attachmentIDs []string) map[string]string {
	if len(attachmentIDs) == 0 {
		return nil
	}
	out := make(map[string]string, len(attachmentIDs))
	for _, attID := range attachmentIDs {
		_, encFilename, _, _, _, err := s.db.GetAttachment(attID)
		if err != nil || encFilename == "" {
			continue
		}
		filename := encryption.DecryptField(encFilename, s.masterKey)
		if filename == "" {
			continue
		}
		key := strings.ToLower(filename)
		if _, exists := out[key]; exists {
			continue
		}
		out[key] = attID
	}
	return out
}

func (s *Service) finalizeMessageOpts(msg *Msg, plainContent string, rawEmbed, rawComponents json.RawMessage, attachmentIDs []string, callerIsBot, isDM, isThread, persist bool) error {
	if len(rawEmbed) > 0 {
		parsed, canonical, perr := embed.ParseAndValidate(rawEmbed, embed.LimitsFrom(s.embedCfg))
		if perr != nil {
			return ErrInvalidRequest
		}
		if parsed != nil && len(attachmentIDs) > 0 {
			names := s.attachmentFilenameMap(attachmentIDs)
			if len(names) > 0 {
				parsed.ResolveAttachmentRefs(names)
				if reCanonical, mErr := json.Marshal(parsed); mErr == nil {
					canonical = string(reCanonical)
				}
			}
		}
		if canonical != "" {
			if persist {
				encEmbed := canonical
				if enc, eerr := encryption.EncryptWithMaster(canonical, s.masterKey); eerr == nil {
					encEmbed = enc
				}
				if err := s.db.UpdateMessageEmbed(msg.ID, encEmbed); err != nil {
					return err
				}
			}
			msg.EmbedData = json.RawMessage(canonical)
		}
	}
	if len(rawComponents) > 0 {
		if !callerIsBot {
			return ErrNotAllowed
		}
		canonical, cerr := ValidateComponents(rawComponents)
		if cerr != nil {
			return ErrInvalidRequest
		}
		if canonical != "" {
			if persist {
				if err := s.db.UpdateMessageComponents(msg.ID, canonical); err != nil {
					return err
				}
			}
			msg.Components = json.RawMessage(canonical)
		}
	}
	msg.Content = plainContent
	msg.IsBot = callerIsBot
	ref := s.ResolveIdentity(msg.UserID, msg.ChannelID)
	msg.Username = ref.Username
	msg.DisplayName = ref.DisplayName
	msg.AvatarID = ref.AvatarID
	msg.Flair = ref.Flair
	if !msg.IsBot {
		msg.IsBot = ref.IsBot
	}
	msg.RoleID = ref.RoleID
	msg.Role = ref.Role
	msg.RoleColor = ref.RoleColor
	if persist && s.LinkAttachment != nil {
		for _, aid := range attachmentIDs {
			s.LinkAttachment(aid, msg.ID)
		}
	}
	if persist && s.GetAttachments != nil {
		msg.Attachments = s.GetAttachments(msg.ID)
	}
	if msg.Attachments == nil {
		msg.Attachments = []MsgAttachment{}
	}
	if persist {
		s.hydrateReply(msg)
	}
	if isDM {
		msg.DM = true
		if persist && s.ReopenDM != nil && s.GetDMParticipants != nil {
			if u1, u2, ok := s.GetDMParticipants(msg.ChannelID); ok {
				s.ReopenDM(msg.ChannelID, u1)
				s.ReopenDM(msg.ChannelID, u2)
			}
		}
	}
	if persist && isThread {
		s.db.IncrementThreadMessageCount(msg.ChannelID)
	}
	return nil
}

func (s *Service) HandleSend(userID string, raw json.RawMessage) {
	var req SendReq
	if json.Unmarshal(raw, &req) != nil {
		return
	}
	if _, err := s.Send(userID, req); err != nil {
		if b, ok := err.(*SendBlockedErr); ok {
			s.hub.SendError(userID, "blocked", b.Reason, req.MessageID)
			return
		}
		if sl, ok := err.(*SlowmodeErr); ok {
			s.hub.SendSlowmode(userID, req.MessageID, sl.RetryAfter)
			return
		}
		if err == ErrNotAllowed {
			s.hub.SendError(userID, "forbidden", err.Error(), req.MessageID)
			return
		}
		s.hub.SendError(userID, "invalid", err.Error(), req.MessageID)
	}
}

func (s *Service) SendBotInteractionReply(
	botUserID, channelID, content string, rawEmbed json.RawMessage,
	rawComponents json.RawMessage,
	interactionID, ephemeralUserID, commandName, commandArgs, invokerID string,
	attachmentIDs []string, replyTo string,
) (*Msg, error) {
	content = strings.TrimSpace(content)
	if content == "" && len(rawEmbed) == 0 && len(attachmentIDs) == 0 {
		return nil, ErrInvalidRequest
	}
	if err := ValidateMessageContent(content, s.cfg); err != nil {
		return nil, err
	}
	authorPerms := permissions.ResolveChannelPerms(s.db, botUserID, channelID)
	isDM := permissions.IsDM(botUserID, channelID)
	isThread := s.db.GetChannelType(channelID) == "thread"

	if ephemeralUserID != "" {
		now := time.Now().UTC().Format(time.RFC3339)
		m := &Msg{
			ID:            id.Generate(),
			ChannelID:     channelID,
			UserID:        botUserID,
			Type:          "bot",
			AuthorPerms:   authorPerms,
			CreatedAt:     now,
			CommandName:   commandName,
			CommandArgs:   commandArgs,
			InvokerID:     invokerID,
			InteractionID: interactionID,
			ReplyTo:       replyTo,
		}
		s.stampGuild(m)
		if err := s.finalizeMessageOpts(m, content, rawEmbed, rawComponents, nil, true, isDM, isThread, false); err != nil {
			return nil, err
		}
		return m, nil
	}

	encContent, err := encryption.EncryptWithMaster(content, s.masterKey)
	if err != nil {
		return nil, err
	}
	encArgs := commandArgs
	if commandArgs != "" {
		if enc, eerr := encryption.EncryptWithMaster(commandArgs, s.masterKey); eerr == nil {
			encArgs = enc
		}
	}
	msg, err := s.createMessageFull(channelID, botUserID, encContent, replyTo, authorPerms, "bot", "", 0, commandName, encArgs, invokerID, interactionID)
	if err != nil {
		return nil, err
	}
	if err := s.finalizeMessage(msg, content, rawEmbed, rawComponents, attachmentIDs, true, isDM, isThread); err != nil {
		return nil, err
	}
	msg.CommandArgs = commandArgs
	if s.OnNotify != nil {
		go s.OnNotify(msg.ChannelID, msg.UserID, msg.Content, msg.AuthorPerms, msg.ReplyTo)
	}
	return msg, nil
}