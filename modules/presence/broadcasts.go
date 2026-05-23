package presence

func (s *Service) emitOnline(userID, channelID string) {
	if s.hub == nil {
		return
	}
	payload := map[string]interface{}{
		"user_id":         userID,
		"online":          true,
		"presence_status": ResolveStatus(s.db, userID, true),
	}
	if s.BuildUser != nil {
		if u := s.BuildUser(userID); u != nil {
			payload["user"] = u
		}
	}
	if channelID != "" {
		s.hub.EmitToChannel(channelID, "user_online", payload)
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_online", payload)
}

func (s *Service) emitOffline(userID, channelID string) {
	if s.hub == nil {
		return
	}
	payload := map[string]interface{}{
		"user_id":         userID,
		"online":          false,
		"presence_status": "offline",
	}
	if channelID != "" {
		s.hub.EmitToChannel(channelID, "user_offline", payload)
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_offline", payload)
}

func (s *Service) emitStatusChange(userID, status string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_presence", map[string]interface{}{
		"user_id":         userID,
		"presence_status": status,
	})
}

func (s *Service) emitGuildPresence(guildID, userID string, online bool, onlineCount, total int) {
	if s.hub == nil {
		return
	}
	payload := map[string]interface{}{
		"guild_id":        guildID,
		"user_id":         userID,
		"online":          online,
		"presence_status": ResolveStatus(s.db, userID, online),
		"online_count":    onlineCount,
		"total":           total,
	}
	if online && s.BuildGuildMember != nil {
		if m := s.BuildGuildMember(guildID, userID); m != nil {
			payload["member"] = m
		}
	}
	s.hub.EmitToGuild(guildID, "guild_presence", payload)
}

func (s *Service) emitAdminUserPresence(userID string, online bool) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_presence", map[string]interface{}{
		"user_id": userID,
		"online":  online,
	})
}