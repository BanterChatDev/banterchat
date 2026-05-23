package messages

import (
	"encoding/json"
	"regexp"
	"strconv"

	"github.com/labstack/echo/v4"
	"ror/modules/attachments"
	"ror/modules/db"
	"ror/modules/embed"
	"ror/modules/encryption"
	"ror/modules/permissions"
	"ror/modules/users"
	"ror/modules/websocket"
)

var reMentionID = regexp.MustCompile(`<@([a-f0-9]+)>`)

func extractMentionIDs(content string) []string {
	matches := reMentionID.FindAllStringSubmatch(content, -1)
	seen := make(map[string]bool, len(matches))
	ids := make([]string, 0, len(matches))
	for _, m := range matches {
		uid := m[1]
		if !seen[uid] {
			seen[uid] = true
			ids = append(ids, uid)
		}
	}
	return ids
}

type Service struct {
	db        *db.DB
	hub       *websocket.Hub
	cfg       Config
	embedCfg  embed.Config
	attCfg    attachments.Config
	masterKey string
	users     interface {
		DecryptUsernameByID(string) string
		DecryptDisplayNameByID(string) string
		DecryptIdentity(userID string) (username, displayName string)
		ResolveDisplayName(userID, guildID string) string
		DecryptUserMinisByIDs(ids []string) map[string]users.DecryptedUserMini
	}
	GetAvatarByUserID func(string) string
	GetFlairByUserID  func(string) string
	GetAttachments      func(messageID string) []MsgAttachment
	GetAttachmentsBatch func(messageIDs []string) map[string][]MsgAttachment
	LinkAttachment    func(attID, messageID string)
	DeleteAttachments func(messageID string)
	OnNotify          func(channelID, senderID, content string, authorPerms int64, replyTo string)
	GetDMParticipants func(convID string) (string, string, bool)
	StripDMMentions   func(content, user1, user2 string) string
	CanSendDM         func(userID, channelID string) (bool, string)
	CheckSlowmode     func(channelID, userID string, effectivePerms int64) (allowed bool, retryAfter int)
	DeleteReactions    func(messageID string)
	GetReactionsBatch  func(messageIDs []string, viewerID string) map[string]interface{}
	ReopenDM          func(convID, userID string)
	CheckIsBot        func(userID string) bool
}

func NewService(database *db.DB, hub *websocket.Hub, cfg Config, embedCfg embed.Config, attCfg attachments.Config, masterKey string, usersSvc interface {
	DecryptUsernameByID(string) string
	DecryptDisplayNameByID(string) string
	DecryptIdentity(userID string) (username, displayName string)
	ResolveDisplayName(userID, guildID string) string
	DecryptUserMinisByIDs(ids []string) map[string]users.DecryptedUserMini
}) *Service {
	return &Service{db: database, hub: hub, cfg: cfg, embedCfg: embedCfg, attCfg: attCfg, masterKey: masterKey, users: usersSvc}
}

func (s *Service) decryptContent(content string) string {
	return encryption.DecryptField(content, s.masterKey)
}

func (s *Service) EncryptForStorage(plain string) (string, error) {
	return encryption.EncryptWithMaster(plain, s.masterKey)
}

func (s *Service) List(c echo.Context) error {
	channelID := c.Param("id")
	userID := c.Get("userID").(string)
	perms := permissions.ResolveChannelPerms(s.db, userID, channelID)
	if !permissions.HasPerm(perms, permissions.PermViewChannels) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	before := c.QueryParam("before")
	after := c.QueryParam("after")
	around := c.QueryParam("around")
	limit := s.cfg.DefaultLimit
	if v := c.QueryParam("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= s.cfg.MaxLimit {
			limit = n
		}
	}
	var msgs []Msg
	var err error
	if around != "" {
		msgs, err = s.listMessagesAround(channelID, around, limit)
	} else if after != "" {
		msgs, err = s.listMessagesAfter(channelID, after, limit)
	} else {
		msgs, err = s.listMessages(channelID, before, limit)
	}
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	if msgs == nil {
		msgs = []Msg{}
	}
	msgs, mentionedUsers := s.hydrate(msgs, userID)
	return c.JSON(200, echo.Map{"messages": msgs, "mentioned_users": mentionedUsers})
}

func (s *Service) ListForDM(channelID, before string, limit int, userID string) (interface{}, error) {
	var msgs []Msg
	var err error
	msgs, err = s.listMessages(channelID, before, limit)
	if err != nil {
		return nil, err
	}
	if msgs == nil {
		msgs = []Msg{}
	}
	msgs, mentionedUsers := s.hydrate(msgs, userID)
	return echo.Map{"messages": msgs, "mentioned_users": mentionedUsers}, nil
}

func (s *Service) hydrate(msgs []Msg, viewerID string) ([]Msg, map[string]interface{}) {
	if len(msgs) == 0 {
		return msgs, map[string]interface{}{}
	}
	for i := range msgs {
		msgs[i].Content = s.decryptContent(msgs[i].Content)
		if msgs[i].CommandArgs != "" {
			msgs[i].CommandArgs = s.decryptContent(msgs[i].CommandArgs)
		}
		if len(msgs[i].EmbedData) > 0 {
			if dec := s.decryptContent(string(msgs[i].EmbedData)); dec != "" && dec != string(msgs[i].EmbedData) {
				msgs[i].EmbedData = json.RawMessage(dec)
			}
		}
	}
	uidSet := make(map[string]struct{})
	chSet := make(map[string]struct{})
	for i := range msgs {
		if msgs[i].ChannelID != "" {
			chSet[msgs[i].ChannelID] = struct{}{}
		}
		if msgs[i].Type == "webhook" {
			continue
		}
		if msgs[i].UserID != "" {
			uidSet[msgs[i].UserID] = struct{}{}
		}
		if msgs[i].InvokerID != "" {
			uidSet[msgs[i].InvokerID] = struct{}{}
		}
		for _, uid := range extractMentionIDs(msgs[i].Content) {
			uidSet[uid] = struct{}{}
		}
	}
	uidList := make([]string, 0, len(uidSet))
	for uid := range uidSet {
		uidList = append(uidList, uid)
	}
	chList := make([]string, 0, len(chSet))
	for ch := range chSet {
		chList = append(chList, ch)
	}
	idents := s.ResolveIdentities(uidList, chList)
	for i := range msgs {
		if msgs[i].GuildID == "" && msgs[i].ChannelID != "" {
			msgs[i].GuildID = idents.GuildIDFor(msgs[i].ChannelID)
		}
	}
	var attMap map[string][]MsgAttachment
	if s.GetAttachmentsBatch != nil {
		ids := make([]string, len(msgs))
		for i := range msgs {
			ids[i] = msgs[i].ID
		}
		attMap = s.GetAttachmentsBatch(ids)
	}
	for i := range msgs {
		if msgs[i].Type == "webhook" {
			var hookMeta struct {
				WebhookID        string `json:"webhook_id"`
				WebhookName      string `json:"webhook_name"`
				WebhookAvatarID  string `json:"webhook_avatar_id"`
				WebhookAvatarURL string `json:"webhook_avatar_url"`
			}
			if len(msgs[i].Meta) > 0 {
				_ = json.Unmarshal(msgs[i].Meta, &hookMeta)
			}
			msgs[i].Username = hookMeta.WebhookName
			msgs[i].DisplayName = hookMeta.WebhookName
			msgs[i].AvatarID = hookMeta.WebhookAvatarID
			msgs[i].AvatarURL = hookMeta.WebhookAvatarURL
		} else {
			ref := idents.GetIn(msgs[i].UserID, msgs[i].ChannelID)
			msgs[i].Username = ref.Username
			msgs[i].DisplayName = ref.DisplayName
			msgs[i].AvatarID = ref.AvatarID
			msgs[i].Flair = ref.Flair
			msgs[i].IsBot = ref.IsBot
			msgs[i].RoleID = ref.RoleID
			msgs[i].Role = ref.Role
			msgs[i].RoleColor = ref.RoleColor
		}
		if msgs[i].InvokerID != "" {
			inv := idents.GetIn(msgs[i].InvokerID, msgs[i].ChannelID)
			msgs[i].InvokerUsername = inv.Username
			msgs[i].InvokerAvatar = inv.AvatarID
			msgs[i].InvokerRoleColor = inv.RoleColor
		}
		if attMap != nil {
			msgs[i].Attachments = attMap[msgs[i].ID]
		} else if s.GetAttachments != nil {
			msgs[i].Attachments = s.GetAttachments(msgs[i].ID)
		}
		if msgs[i].Attachments == nil {
			msgs[i].Attachments = []MsgAttachment{}
		}
	}
	s.batchHydrateReplies(msgs, idents)
	if s.GetReactionsBatch != nil {
		ids := make([]string, len(msgs))
		for i := range msgs {
			ids[i] = msgs[i].ID
		}
		batch := s.GetReactionsBatch(ids, viewerID)
		for i := range msgs {
			if r, ok := batch[msgs[i].ID]; ok {
				raw, _ := json.Marshal(r)
				if len(raw) > 2 {
					msgs[i].Reactions = raw
				}
			}
		}
	}
	mentioned := make(map[string]interface{}, len(uidSet))
	for uid := range uidSet {
		ref := idents.Get(uid)
		if ref.Username == "" {
			continue
		}
		mentioned[uid] = map[string]string{
			"username":  ref.Username,
			"avatar_id": ref.AvatarID,
			"flair":     ref.Flair,
		}
	}
	return msgs, mentioned
}

type InvokerInfo struct {
	ID        string
	Username  string
	AvatarID  string
	RoleColor string
}

func (s *Service) InvokerInfoFor(userID, channelID string) InvokerInfo {
	if userID == "" {
		return InvokerInfo{}
	}
	ref := s.ResolveIdentity(userID, channelID)
	return InvokerInfo{
		ID:        userID,
		Username:  ref.Username,
		AvatarID:  ref.AvatarID,
		RoleColor: ref.RoleColor,
	}
}