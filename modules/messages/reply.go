package messages

import (
	"encoding/json"
	"ror/modules/reply"
)

func extractEmbedText(embedData string) string {
	if embedData == "" {
		return ""
	}
	var e struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if json.Unmarshal([]byte(embedData), &e) != nil {
		return ""
	}
	if e.Title != "" && e.Description != "" {
		return e.Title + " — " + e.Description
	}
	if e.Title != "" {
		return e.Title
	}
	return e.Description
}

func (s *Service) buildReplyData(messageID string) *reply.Data {
	if messageID == "" {
		return nil
	}
	uid, channelID, content, authorPerms, embedData, err := s.db.GetReplyData(messageID)
	if err != nil {
		return nil
	}
	return s.assembleReplyData(messageID, uid, channelID, content, embedData, authorPerms)
}

func (s *Service) assembleReplyData(messageID, uid, channelID, content, embedData string, authorPerms int64) *reply.Data {
	plain := s.decryptContent(content)
	if plain == "" {
		plain = extractEmbedText(embedData)
	}
	if len(plain) > 100 {
		plain = plain[:100] + "…"
	}
	ref := s.ResolveIdentity(uid, channelID)
	attCount := 0
	if plain == "" {
		attCount = s.db.CountAttachmentsByMessage(messageID)
	}
	return &reply.Data{
		ID:              messageID,
		UserID:          uid,
		Username:        ref.Username,
		DisplayName:     ref.DisplayName,
		AvatarID:        ref.AvatarID,
		RoleColor:       ref.RoleColor,
		Content:         plain,
		AuthorPerms:     authorPerms,
		AttachmentCount: attCount,
	}
}

func (s *Service) hydrateReply(m *Msg) {
	if m.ReplyTo == "" {
		return
	}
	m.Reply = s.buildReplyData(m.ReplyTo)
}

func (s *Service) listMessagesAround(channelID, messageID string, limit int) ([]Msg, error) {
	if limit <= 0 {
		limit = 50
	}
	half := limit / 2
	targetTime, err := s.db.GetMessageTime(messageID, channelID)
	if err != nil {
		return s.listMessages(channelID, "", limit)
	}
	rows, err := s.db.ListMessagesAroundBefore(channelID, targetTime, half+1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	before := scanMsgRows(rows)
	rows2, err := s.db.ListMessagesAroundAfter(channelID, targetTime, half)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()
	after := scanMsgRows(rows2)
	for i, j := 0, len(before)-1; i < j; i, j = i+1, j-1 {
		before[i], before[j] = before[j], before[i]
	}
	msgs := append(before, after...)
	return msgs, nil
}

func (s *Service) batchHydrateReplies(msgs []Msg, idents IdentityBatch) {
	var replyIDs []string
	for i := range msgs {
		if msgs[i].ReplyTo != "" {
			replyIDs = append(replyIDs, msgs[i].ReplyTo)
		}
	}
	if len(replyIDs) == 0 {
		return
	}
	batch, err := s.db.GetReplyDataBatch(replyIDs)
	if err != nil || len(batch) == 0 {
		return
	}
	missingUsers := make(map[string]struct{})
	missingChans := make(map[string]struct{})
	for _, row := range batch {
		if row.UserID == "" {
			continue
		}
		if _, ok := idents.minis[row.UserID]; !ok {
			missingUsers[row.UserID] = struct{}{}
		}
		if row.ChannelID != "" {
			if _, ok := idents.guildOfChan[row.ChannelID]; !ok {
				missingChans[row.ChannelID] = struct{}{}
			}
		}
	}
	var extra IdentityBatch
	if len(missingUsers) > 0 || len(missingChans) > 0 {
		uidList := make([]string, 0, len(missingUsers))
		for uid := range missingUsers {
			uidList = append(uidList, uid)
		}
		chList := make([]string, 0, len(missingChans))
		for ch := range missingChans {
			chList = append(chList, ch)
		}
		extra = s.ResolveIdentities(uidList, chList)
	}
	resolve := func(uid, channelID string) IdentityRef {
		if _, ok := idents.minis[uid]; ok {
			return idents.GetIn(uid, channelID)
		}
		return extra.GetIn(uid, channelID)
	}
	emptyContentReplyIDs := []string{}
	for i := range msgs {
		if msgs[i].ReplyTo == "" {
			continue
		}
		row, ok := batch[msgs[i].ReplyTo]
		if !ok {
			continue
		}
		plain := s.decryptContent(row.Content)
		if plain == "" {
			plain = extractEmbedText(row.EmbedData)
		}
		if plain == "" {
			emptyContentReplyIDs = append(emptyContentReplyIDs, msgs[i].ReplyTo)
		}
	}
	attCounts := map[string]int{}
	if len(emptyContentReplyIDs) > 0 {
		attCounts = s.db.CountAttachmentsByMessages(emptyContentReplyIDs)
	}
	for i := range msgs {
		if msgs[i].ReplyTo == "" {
			continue
		}
		row, ok := batch[msgs[i].ReplyTo]
		if !ok {
			continue
		}
		plain := s.decryptContent(row.Content)
		if plain == "" {
			plain = extractEmbedText(row.EmbedData)
		}
		if len(plain) > 100 {
			plain = plain[:100] + "…"
		}
		ref := resolve(row.UserID, row.ChannelID)
		msgs[i].Reply = &reply.Data{
			ID:              msgs[i].ReplyTo,
			UserID:          row.UserID,
			Username:        ref.Username,
			DisplayName:     ref.DisplayName,
			AvatarID:        ref.AvatarID,
			RoleColor:       ref.RoleColor,
			Content:         plain,
			AuthorPerms:     row.AuthorPerms,
			AttachmentCount: attCounts[msgs[i].ReplyTo],
		}
	}
}