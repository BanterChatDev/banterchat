package messages

import (
	"database/sql"
	"encoding/json"
	"sync"
	"time"

	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/id"
	"ror/modules/reply"
)

type topRoleEntry struct {
	id, name, color string
	expires         time.Time
}

var (
	topRoleCache sync.Map
	topRoleTTL   = 30 * time.Second
)

func topRoleCacheKey(userID, guildID string) string {
	return userID + ":" + guildID
}

// InvalidateTopRoleCache clears cached top-role for a (userID, guildID) pair.
// Call from role assignment/unassignment paths.
func InvalidateTopRoleCache(userID, guildID string) {
	topRoleCache.Delete(topRoleCacheKey(userID, guildID))
}

// InvalidateTopRoleCacheForUser clears all cached top-role entries for a user
// (across all guilds). Use when the user's role memberships change in bulk
// (e.g. ban-from-guild removes them everywhere).
func InvalidateTopRoleCacheForUser(userID string) {
	prefix := userID + ":"
	topRoleCache.Range(func(k, _ any) bool {
		if s, ok := k.(string); ok && len(s) >= len(prefix) && s[:len(prefix)] == prefix {
			topRoleCache.Delete(k)
		}
		return true
	})
}

// MsgAttachment is an alias for db.AttachmentMiniRow to eliminate duplication
type MsgAttachment = db.AttachmentMiniRow

// FlagVoiceMessage marks a message as a voice message. Mirrors Discord's
// IS_VOICE_MESSAGE bit (1 << 13). Voice messages are regular messages
// with a single audio attachment that carries duration_secs + waveform;
// the flag tells clients to render the voice player instead of the
// generic audio attachment view.
const FlagVoiceMessage int64 = 1 << 13


type Msg struct {
	ID          string          `json:"id"`
	ChannelID   string          `json:"channel_id"`
	GuildID     string          `json:"guild_id,omitempty"`
	UserID      string          `json:"user_id"`
	Username    string          `json:"username"`
	DisplayName string          `json:"display_name,omitempty"`
	AvatarID    string          `json:"avatar_id"`
	AvatarURL   string          `json:"avatar_url,omitempty"`
	RoleID      string          `json:"-"`
	Role        string          `json:"role,omitempty"`
	RoleColor   string          `json:"role_color,omitempty"`
	Flair       string          `json:"flair"`
	Content     string          `json:"content"`
	Type        string          `json:"type"`
	Flags       int64           `json:"flags,omitempty"`
	SystemType  string          `json:"system_type,omitempty"`
	Meta        json.RawMessage `json:"meta,omitempty"`
	EmbedData   json.RawMessage `json:"embed,omitempty"`
	Components  json.RawMessage `json:"components,omitempty"`
	Attachments []MsgAttachment `json:"attachments"`
	Reactions   json.RawMessage `json:"reactions,omitempty"`
	ReplyTo     string          `json:"reply_to"`
	Reply       *reply.Data     `json:"reply,omitempty"`
	CreatedAt   string          `json:"created_at"`
	AuthorPerms int64           `json:"author_perms"`
	Edited      bool            `json:"edited"`
	CommandName      string          `json:"command_name,omitempty"`
	CommandArgs      string          `json:"command_args,omitempty"`
	IsBot            bool            `json:"is_bot,omitempty"`
	DM               bool            `json:"_dm,omitempty"`
	InvokerID        string          `json:"invoker_id,omitempty"`
	InvokerUsername  string          `json:"invoker_username,omitempty"`
	InvokerAvatar    string          `json:"invoker_avatar,omitempty"`
	InvokerRoleColor string          `json:"invoker_role_color,omitempty"`
	InteractionID    string          `json:"interaction_id,omitempty"`
}

func (s *Service) getTopRole(userID, channelID string) (string, string, string) {
	guildID := s.db.GetChannelGuildID(channelID)
	if guildID == "" {
		return "", "", ""
	}
	key := topRoleCacheKey(userID, guildID)
	now := time.Now()
	if cached, ok := topRoleCache.Load(key); ok {
		if e, ok := cached.(topRoleEntry); ok && now.Before(e.expires) {
			return e.id, e.name, e.color
		}
	}
	id, name, color := s.db.GetTopRoleForUserInGuild(userID, guildID)
	topRoleCache.Store(key, topRoleEntry{id: id, name: name, color: color, expires: now.Add(topRoleTTL)})
	return id, name, color
}

// stampGuild sets m.GuildID based on m.ChannelID. Single canonical place
// to attach guild_id to a message — every outgoing Msg (REST list, WS
// broadcast, bot-authored) calls this so the wire format is consistent.
// No-ops when m is nil or GuildID is already set (idempotent; safe to
// call more than once). For DM channels the DB lookup returns "" and
// the JSON tag's omitempty drops it from the payload.
func (s *Service) stampGuild(m *Msg) {
	if m == nil || m.GuildID != "" || m.ChannelID == "" {
		return
	}
	m.GuildID = s.db.GetChannelGuildID(m.ChannelID)
}

func (s *Service) createMessage(channelID, userID, content, replyTo string, authorPerms int64) (*Msg, error) {
	return s.createMessageTyped(channelID, userID, content, replyTo, authorPerms, "user", "", 0)
}

func (s *Service) createMessageTyped(channelID, userID, content, replyTo string, authorPerms int64, msgType, meta string, flags int64) (*Msg, error) {
	return s.createMessageFull(channelID, userID, content, replyTo, authorPerms, msgType, meta, flags, "", "", "", "")
}

func (s *Service) createMessageFull(channelID, userID, content, replyTo string, authorPerms int64, msgType, meta string, flags int64, commandName, commandArgs, invokerID, interactionID string) (*Msg, error) {
	if msgType == "" {
		msgType = "user"
	}
	msgID := id.Generate()
	now := time.Now().UTC().Format(time.RFC3339)
	guildID := s.db.GetChannelGuildID(channelID)
	if err := s.db.InsertMessageRow(db.MessageRow{
		ID:            msgID,
		GuildID:       guildID,
		ChannelID:     channelID,
		UserID:        userID,
		Content:       content,
		Type:          msgType,
		Meta:          meta,
		AuthorPerms:   authorPerms,
		ReplyTo:       replyTo,
		CreatedAt:     now,
		Flags:         flags,
		CommandName:   commandName,
		CommandArgs:   commandArgs,
		InvokerID:     invokerID,
		InteractionID: interactionID,
	}); err != nil {
		return nil, err
	}
	roleID, role, roleColor := s.getTopRole(userID, channelID)
	m := &Msg{
		ID: msgID, GuildID: guildID, ChannelID: channelID, UserID: userID,
		RoleID: roleID, Role: role, RoleColor: roleColor,
		Content: content, Type: msgType, ReplyTo: replyTo,
		CreatedAt: now, AuthorPerms: authorPerms, Flags: flags,
		CommandName: commandName, CommandArgs: commandArgs,
		InvokerID: invokerID, InteractionID: interactionID,
	}
	if meta != "" {
		m.Meta = json.RawMessage(meta)
	}
	s.stampGuild(m)
	return m, nil
}

// GetMessage is the exported wrapper around the internal fetch used by
// the admin / reports flow to build target snapshots. Signature is
// deliberately identical to getMessage so internal callers can switch
// opportunistically during refactors.
func (s *Service) GetMessage(id string) (*Msg, error) {
	return s.getMessage(id)
}

func (s *Service) getMessage(id string) (*Msg, error) {
	msgID, channelID, userID, _, content, authorPerms, edited, replyTo, createdAt, commandName, commandArgs, msgType, embedData, invokerID, err := s.db.GetMessageRow(id)
	if err != nil {
		return nil, err
	}
	content = encryption.DecryptField(content, s.masterKey)
	commandArgs = encryption.DecryptField(commandArgs, s.masterKey)
	embedData = encryption.DecryptField(embedData, s.masterKey)
	m := &Msg{ID: msgID, ChannelID: channelID, UserID: userID, Content: content, AuthorPerms: authorPerms, Edited: edited, ReplyTo: replyTo, CreatedAt: createdAt, CommandName: commandName, CommandArgs: commandArgs, Type: msgType, InvokerID: invokerID}
	if embedData != "" {
		m.EmbedData = json.RawMessage(embedData)
	}
	s.stampGuild(m)
	ref := s.ResolveIdentity(m.UserID, m.ChannelID)
	m.Username = ref.Username
	m.DisplayName = ref.DisplayName
	m.AvatarID = ref.AvatarID
	m.Flair = ref.Flair
	m.IsBot = ref.IsBot
	m.RoleID = ref.RoleID
	m.Role = ref.Role
	m.RoleColor = ref.RoleColor
	s.hydrateReply(m)
	return m, nil
}


func (s *Service) updateMessage(id, content string) error {
	return s.db.UpdateMessageContent(id, content)
}

func (s *Service) deleteMessage(id string) error {
	return s.db.DeleteMessage(id)
}

func (s *Service) DeleteByChannel(channelID string) {
	s.db.DeleteMessagesByChannel(channelID)
}

func (s *Service) DeleteUserGuildMessages(guildID, userID string) {
	deleted, err := s.db.DeleteUserMessagesInGuild(guildID, userID)
	if err != nil || len(deleted) == 0 {
		return
	}
	for channelID, ids := range deleted {
		s.emitDeleteBulk(ids, channelID)
	}
}

func scanMsgRows(rows *sql.Rows) []Msg {
	var msgs []Msg
	for rows.Next() {
		var m Msg
		var embedStr, metaStr, compStr string
		if err := rows.Scan(&m.ID, &m.ChannelID, &m.UserID, &m.Username, &m.Content, &m.AuthorPerms, &m.Edited, &m.ReplyTo, &m.CreatedAt, &m.CommandName, &m.CommandArgs, &m.Type, &embedStr, &m.InvokerID, &m.InteractionID, &m.SystemType, &metaStr, &compStr, &m.Flags); err != nil {
			continue
		}
		if embedStr != "" {
			m.EmbedData = json.RawMessage(embedStr)
		}
		if metaStr != "" {
			m.Meta = json.RawMessage(metaStr)
		}
		if compStr != "" {
			m.Components = json.RawMessage(compStr)
		}
		msgs = append(msgs, m)
	}
	return msgs
}

func (s *Service) listMessages(channelID, before string, limit int) ([]Msg, error) {
	if limit <= 0 {
		limit = 50
	}
	var rows *sql.Rows
	var err error
	if before != "" {
		rows, err = s.db.ListMessagesBefore(channelID, before, limit)
	} else {
		rows, err = s.db.ListMessagesLatest(channelID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	msgs := scanMsgRows(rows)
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

func (s *Service) listMessagesAfter(channelID, after string, limit int) ([]Msg, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.ListMessagesAfter(channelID, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	msgs := scanMsgRows(rows)
	return msgs, nil
}

func (s *Service) SendSystemMessage(channelID, systemType string, meta map[string]interface{}) string {
	msgID := id.Generate()
	now := time.Now().UTC().Format(time.RFC3339)
	if meta == nil {
		meta = map[string]interface{}{}
	}
	if uidRaw, ok := meta["user_id"]; ok {
		if uid, _ := uidRaw.(string); uid != "" {
			if _, hasName := meta["username"]; !hasName {
				meta["username"] = s.users.DecryptUsernameByID(uid)
			}
			if _, hasDisplay := meta["display_name"]; !hasDisplay {
				meta["display_name"] = s.users.ResolveDisplayName(uid, s.db.GetChannelGuildID(channelID))
			}
			if _, hasAvatar := meta["avatar_id"]; !hasAvatar && s.GetAvatarByUserID != nil {
				meta["avatar_id"] = s.GetAvatarByUserID(uid)
			}
			if _, hasColor := meta["role_color"]; !hasColor {
				_, _, color := s.getTopRole(uid, channelID)
				if color != "" {
					meta["role_color"] = color
				}
			}
		}
	}
	metaJSON := "{}"
	if b, err := json.Marshal(meta); err == nil {
		metaJSON = string(b)
	}
	if err := s.db.InsertMessageRow(db.MessageRow{
		ID:         msgID,
		GuildID:    s.db.GetChannelGuildID(channelID),
		ChannelID:  channelID,
		Type:       "system",
		SystemType: systemType,
		Meta:       metaJSON,
		CreatedAt:  now,
	}); err != nil {
		return ""
	}
	msg := Msg{
		ID:          msgID,
		ChannelID:   channelID,
		Type:        "system",
		SystemType:  systemType,
		Meta:        json.RawMessage(metaJSON),
		Attachments: []MsgAttachment{},
		CreatedAt:   now,
	}
	s.stampGuild(&msg)
	s.emitChannelMessage(channelID, msg)
	if s.OnNotify != nil {
		senderID := ""
		if uidRaw, ok := meta["user_id"]; ok {
			if uid, _ := uidRaw.(string); uid != "" {
				senderID = uid
			}
		}
		go s.OnNotify(channelID, senderID, "", 0, "")
	}
	return msgID
}