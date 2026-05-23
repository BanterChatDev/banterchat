package channels

func (s *Service) emitCreate(guildID string, ch interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "channel_create", ch)
}

func (s *Service) emitUpdate(guildID string, ch interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "channel_update", ch)
}

func (s *Service) emitDelete(guildID, id string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "channel_delete", map[string]string{"id": id, "guild_id": guildID})
}

func (s *Service) emitReorder(guildID string, channels interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToGuild(guildID, "channel_reorder", channels)
}