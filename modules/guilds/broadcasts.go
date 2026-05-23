package guilds

import "ror/modules/websocket"

func (s *Service) emitUpdate(guildID string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "guild_update", payload)
}

func (s *Service) emitBanAdd(guildID, userID, reason string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "guild_ban_add", map[string]string{
		"guild_id": guildID,
		"user_id":  userID,
		"reason":   reason,
	})
}

func (s *Service) emitBanRemove(guildID, userID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "guild_ban_remove", map[string]string{
		"guild_id": guildID,
		"user_id":  userID,
	})
}

func (s *Service) emitMemberProfile(guildID string, patch map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "guild_member_profile", patch)
}

func EmitMemberRoleUpdate(hub *websocket.Hub, guildID, userID string, roles interface{}) {
	if hub == nil {
		return
	}
	hub.EmitToGuild(guildID, "guild_member_role_update", map[string]interface{}{
		"guild_id": guildID,
		"user_id":  userID,
		"roles":    roles,
	})
}

func EmitMemberAdd(hub *websocket.Hub, guildID, userID string, isBot bool, member map[string]interface{}) {
	if hub == nil {
		return
	}
	if idx := hub.GuildIndex(); idx != nil {
		idx.AddMember(guildID, userID)
	}
	payload := map[string]interface{}{
		"guild_id": guildID,
		"user_id":  userID,
		"is_bot":   isBot,
	}
	if member != nil {
		payload["member"] = member
	}
	hub.EmitToGuild(guildID, "guild_member_add", payload)
	if hub.OnGuildMemberAdd != nil {
		hub.OnGuildMemberAdd(guildID, userID)
	}
}

func EmitMemberRemove(hub *websocket.Hub, guildID, userID string) {
	if hub == nil {
		return
	}
	if idx := hub.GuildIndex(); idx != nil {
		idx.RemoveMember(guildID, userID)
	}
	hub.EmitToGuild(guildID, "guild_member_remove", map[string]string{
		"guild_id": guildID,
		"user_id":  userID,
	})
}

func EmitListUpdate(hub *websocket.Hub, userID string) {
	if hub == nil || userID == "" || hub.GetGuildsForUser == nil {
		return
	}
	hub.EmitTo(userID, "guild_list", hub.GetGuildsForUser(userID))
}

var OnMemberJoin func(guildID, userID string)