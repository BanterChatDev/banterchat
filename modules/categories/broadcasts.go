package categories

func (s *Service) emitCreate(guildID string, cat interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "category_create", cat)
}

func (s *Service) emitUpdate(guildID string, cat interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "category_update", cat)
}

func (s *Service) emitDelete(guildID, id string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "category_delete", map[string]string{"id": id, "guild_id": guildID})
}

func (s *Service) emitReorder(guildID string, cats interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "category_reorder", cats)
}