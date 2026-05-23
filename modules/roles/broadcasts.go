package roles

func (s *Service) emitCreate(guildID string, role interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "role_create", role)
}

func (s *Service) emitUpdate(guildID string, role interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "role_update", role)
}

func (s *Service) emitDelete(guildID, id string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "role_delete", map[string]string{"id": id, "guild_id": guildID})
}