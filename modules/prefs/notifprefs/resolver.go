package notifprefs

func (s *Service) ShouldNotify(userID, channelID, guildID string, isMention bool) (unread bool, mention bool) {
	if s.resolveLevel(userID, channelID, guildID) == LevelNothing {
		return false, false
	}
	return true, isMention
}

func (s *Service) resolveLevel(userID, channelID, guildID string) string {
	if channelID != "" {
		if p, ok, _ := s.loadOne(userID, ScopeChannel, channelID); ok && p.Level != "" {
			return p.Level
		}
	}
	if guildID != "" {
		if p, ok, _ := s.loadOne(userID, ScopeGuild, guildID); ok && p.Level != "" {
			return p.Level
		}
	}
	if p, ok, _ := s.loadOne(userID, ScopeGlobal, ""); ok && p.Level != "" {
		return p.Level
	}
	return LevelMentions
}

func (s *Service) PrefsForGuildScope(userIDs []string, channelID, guildID string) map[string]Pref {
	out := make(map[string]Pref, len(userIDs))
	if len(userIDs) == 0 {
		return out
	}
	global := s.loadPrefsBatch(userIDs, ScopeGlobal, "")
	for uid, p := range global {
		out[uid] = p
	}
	if guildID != "" {
		guild := s.loadPrefsBatch(userIDs, ScopeGuild, guildID)
		for uid, p := range guild {
			out[uid] = p
		}
	}
	if channelID != "" {
		channel := s.loadPrefsBatch(userIDs, ScopeChannel, channelID)
		for uid, p := range channel {
			out[uid] = p
		}
	}
	return out
}