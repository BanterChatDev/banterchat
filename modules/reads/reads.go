package reads

import (
	"ror/modules/db"
	"ror/modules/logger"
	"ror/modules/permissions"
	"ror/modules/prefs/notifprefs"
	"ror/modules/websocket"
	"regexp"
	"strings"
)

var (
	reMention     = regexp.MustCompile(`<@([^>]+)>`)
	reRoleMention = regexp.MustCompile(`<&([^>]+)>`)
)

type Read struct {
	ChannelID string `json:"channel_id"`
	GuildID   string `json:"guild_id,omitempty"`
	Unread    int    `json:"unread"`
	Mentions  int    `json:"mentions"`
}

type Service struct {
	db                *db.DB
	hub               *websocket.Hub
	notif             *notifprefs.Service
	GetDMParticipants func(convID string) (string, string, bool)
}

func NewService(db *db.DB, hub *websocket.Hub) *Service { return &Service{db: db, hub: hub} }

func (s *Service) SetNotif(n *notifprefs.Service) {
	s.notif = n
}

func (s *Service) usersWithAccess(channelID, excludeID string) []string {
	guildID := s.db.GetChannelGuildID(channelID)
	if guildID == "" {
		return nil
	}
	members, err := s.db.ListGuildMembers(guildID)
	if err != nil {
		return nil
	}
	candidates := make([]string, 0, len(members))
	for _, m := range members {
		if m.UserID != excludeID {
			candidates = append(candidates, m.UserID)
		}
	}
	if len(candidates) == 0 {
		return nil
	}
	permsMap := permissions.ResolveChannelPermsBatch(s.db, candidates, channelID)
	result := make([]string, 0, len(permsMap))
	for uid, p := range permsMap {
		if permissions.HasPerm(p, permissions.PermViewChannels) {
			result = append(result, uid)
		}
	}
	return result
}

func (s *Service) OnMessage(channelID, senderID, content string, authorPerms int64, replyTo string) {
	logger.Info("reads: OnMessage", "channel", channelID, "sender", senderID)
	if s.GetDMParticipants != nil {
		if u1, u2, ok := s.GetDMParticipants(channelID); ok {
			peerID := u1
			if peerID == senderID {
				peerID = u2
			}
			unread, mention := s.notif.ShouldNotify(peerID, channelID, "", true)
			logger.Info("reads: DM branch", "peer", peerID, "unread", unread, "mention", mention)
			if !unread {
				return
			}
			s.upsertUnread(peerID, channelID)
			if mention {
				s.upsertMention(peerID, channelID)
			}
			return
		}
	}
	viewable := s.usersWithAccess(channelID, senderID)
	if len(viewable) == 0 {
		return
	}

	guildID := s.db.GetChannelGuildID(channelID)
	prefs := s.notif.PrefsForGuildScope(viewable, channelID, guildID)

	everyoneMention := strings.Contains(content, "<@everyone>") && permissions.HasPerm(authorPerms, permissions.PermMentionEveryone)
	mentioned := make(map[string]bool)
	if everyoneMention {
		for _, uid := range viewable {
			mentioned[uid] = true
		}
	}

	viewableSet := make(map[string]bool, len(viewable))
	for _, uid := range viewable {
		viewableSet[uid] = true
	}

	for _, m := range reMention.FindAllStringSubmatch(content, -1) {
		uid := m[1]
		if uid != "everyone" && uid != senderID && viewableSet[uid] {
			mentioned[uid] = true
		}
	}

	for _, m := range reRoleMention.FindAllStringSubmatch(content, -1) {
		roleID := m[1]
		ids, err := s.db.UsersWithRoleExcept(senderID, roleID)
		if err == nil {
			for _, uid := range ids {
				if viewableSet[uid] {
					mentioned[uid] = true
				}
			}
		}
	}

	if replyTo != "" {
		authorID := s.getMessageAuthor(replyTo)
		if authorID != "" && authorID != senderID && viewableSet[authorID] {
			mentioned[authorID] = true
		}
	}

	unreadIDs := make([]string, 0, len(viewable))
	mentionIDs := make([]string, 0, len(mentioned))
	for _, uid := range viewable {
		if uid == senderID {
			continue
		}
		isM := mentioned[uid]
		pref, hasPref := prefs[uid]
		level := notifprefs.LevelMentions
		if hasPref && pref.Level != "" {
			level = pref.Level
		}
		if level == notifprefs.LevelNothing {
			continue
		}
		direct := s.hasDirectMention(uid, senderID, content, replyTo)
		if everyoneMention && !direct && hasPref && pref.SuppressEveryone {
			isM = false
		}
		if isM && !direct && !everyoneMention && hasPref && pref.SuppressRoles {
			isM = false
		}
		unreadIDs = append(unreadIDs, uid)
		if isM {
			mentionIDs = append(mentionIDs, uid)
		}
	}

	logger.Info("reads: guild branch", "channel", channelID, "viewable", len(viewable), "unreadCount", len(unreadIDs), "mentionCount", len(mentionIDs))
	s.upsertNotificationsBatch(unreadIDs, mentionIDs, channelID)
}

func (s *Service) hasDirectMention(userID, senderID, content, replyTo string) bool {
	for _, m := range reMention.FindAllStringSubmatch(content, -1) {
		if m[1] == userID {
			return true
		}
	}
	if replyTo != "" {
		if s.getMessageAuthor(replyTo) == userID && userID != senderID {
			return true
		}
	}
	return false
}