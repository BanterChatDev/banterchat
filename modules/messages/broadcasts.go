package messages

func (s *Service) emitChannelMessage(channelID string, msg interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "channel_message", msg)
}

func (s *Service) emitEdit(id, channelID, content string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "message_edit", map[string]string{"id": id, "channel_id": channelID, "content": content})
}

func (s *Service) emitDelete(id, channelID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "message_delete", map[string]string{"id": id, "channel_id": channelID})
}

func (s *Service) emitDeleteBulk(ids []string, channelID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "message_delete_bulk", map[string]interface{}{"ids": ids, "channel_id": channelID})
}

// EmitUpdate is the public emit for cross-package callers (interactions
// uses this when a bot edits an existing interaction reply). Other
// emits in this file are unexported because they're used only within
// the messages package itself.
func (s *Service) EmitUpdate(channelID string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToChannel(channelID, "message_update", payload)
}