package dms

import "regexp"

var reDMMention = regexp.MustCompile(`<@([a-f0-9]+)>`)

func (s *Service) ValidatePeer(userID, peerID string) error {
	if peerID == "" {
		return ErrInvalidRequest
	}
	if peerID == userID {
		return ErrCannotDMSelf
	}
	if !s.db.UserExists(peerID) {
		return ErrUserNotFound
	}
	return nil
}

func (s *Service) ValidateConversationLimit(userID string) bool {
	return s.db.CountConversations(userID) < s.cfg.MaxConversations
}

func (s *Service) IsDMChannel(channelID string) bool {
	return s.db.IsDMChannel(channelID)
}

func (s *Service) GetParticipants(convID string) (string, string, bool) {
	conv, err := s.GetConversation(convID)
	if err != nil {
		return "", "", false
	}
	return conv.User1ID, conv.User2ID, true
}

// CanSendDM encapsulates the DM-specific send gate: resolves the DM's peer
// and checks for a block in either direction. Returns (true, "") when send
// is allowed; (false, reason) when it's blocked. The reason string is what
// gets surfaced as the WS error to the sender.
//
// Injected into messages.Service as a callback so the message socket
// handler doesn't need to know about DM internals — it just asks "can I
// send this to this channel?" and routes the rejection through its own
// error-emit path.
func (s *Service) CanSendDM(userID, channelID string) (bool, string) {
	u1, u2, ok := s.GetParticipants(channelID)
	if !ok {
		return true, ""
	}
	peerID := u1
	if peerID == userID {
		peerID = u2
	}
	if s.db.IsBlockedEitherWay(userID, peerID) {
		return false, "cannot send message — blocked"
	}
	return true, ""
}

func StripInvalidMentions(content string, user1ID, user2ID string) string {
	return reDMMention.ReplaceAllStringFunc(content, func(match string) string {
		sub := reDMMention.FindStringSubmatch(match)
		if len(sub) < 2 {
			return match
		}
		uid := sub[1]
		if uid == user1ID || uid == user2ID || uid == "everyone" {
			return match
		}
		return sub[1][:6]
	})
}