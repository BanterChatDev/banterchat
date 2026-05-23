package users

func (s *Service) ResolveDisplayName(userID, guildID string) string {
	if guildID != "" {
		if nick := s.db.GetGuildMemberNickname(guildID, userID); nick != "" {
			return nick
		}
	}
	dn := s.DecryptDisplayNameByID(userID)
	if dn != "" {
		return dn
	}
	return s.DecryptUsernameByID(userID)
}

func (s *Service) ResolveDisplayNamesBatch(userIDs []string, guildID string) map[string]string {
	if len(userIDs) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(userIDs))
	var nicks map[string]string
	if guildID != "" {
		nicks = s.db.GetGuildMemberNicknames(guildID, userIDs)
	}
	minis := s.DecryptUserMinisByIDs(userIDs)
	for _, uid := range userIDs {
		if nicks != nil {
			if nick, ok := nicks[uid]; ok && nick != "" {
				out[uid] = nick
				continue
			}
		}
		if mini, ok := minis[uid]; ok {
			if mini.DisplayName != "" {
				out[uid] = mini.DisplayName
			} else {
				out[uid] = mini.Username
			}
		}
	}
	return out
}