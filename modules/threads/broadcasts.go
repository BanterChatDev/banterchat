package threads

func (s *Service) emitCreate(parentChannelID string, thread interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(parentChannelID, "thread_create", thread)
}

func (s *Service) emitUpdate(parentChannelID string, thread interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(parentChannelID, "thread_update", thread)
}

func (s *Service) emitDelete(parentChannelID, threadID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(parentChannelID, "thread_delete", map[string]string{"id": threadID, "parent_channel_id": parentChannelID})
}