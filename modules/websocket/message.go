package websocket

import "encoding/json"

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

func (h *Hub) frameFor(client *Client, humanData []byte, eventType string, payloadData json.RawMessage) []byte {
	if !client.isBot {
		return humanData
	}
	seq := client.assignSeq()
	frame, err := json.Marshal(BotFrame{Op: OpDispatch, Type: eventType, Data: payloadData, Sequence: seq})
	if err != nil {
		return humanData
	}
	client.bufferFrame(seq, frame)
	return frame
}

func (h *Hub) deliver(client *Client, humanData []byte, eventType string, payloadData json.RawMessage, intent int64) {
	if !client.acceptsEvent(intent) {
		return
	}
	data := h.frameFor(client, humanData, eventType, payloadData)
	select {
	case client.send <- data:
	case <-client.done:
	}
}

func (h *Hub) marshalParts(msg Message) (humanData []byte, payloadData json.RawMessage, ok bool) {
	data, err := json.Marshal(msg)
	if err != nil {
		return nil, nil, false
	}
	payloadData, _ = json.Marshal(msg.Payload)
	return data, payloadData, true
}

func (h *Hub) Send(userID string, msg Message) {
	humanData, payloadData, ok := h.marshalParts(msg)
	if !ok {
		return
	}
	intent := h.intentForEvent(msg.Type)
	h.mu.RLock()
	targets := make([]*Client, 0, len(h.clients[userID]))
	for c := range h.clients[userID] {
		targets = append(targets, c)
	}
	h.mu.RUnlock()
	for _, client := range targets {
		h.deliver(client, humanData, msg.Type, payloadData, intent)
	}
}

func (h *Hub) SendError(userID, code, text string, messageID ...string) {
	payload := map[string]string{"code": code, "message": text}
	if len(messageID) > 0 && messageID[0] != "" {
		payload["message_id"] = messageID[0]
	}
	h.Send(userID, Message{Type: "error", Payload: payload})
}

func (h *Hub) SendRateLimited(userID, messageID string, retryAfter float64) {
	payload := map[string]interface{}{
		"code":        "rate_limited",
		"message":     "slow down",
		"retry_after": retryAfter,
	}
	if messageID != "" {
		payload["message_id"] = messageID
	}
	h.Send(userID, Message{Type: "error", Payload: payload})
}

func (h *Hub) SendSlowmode(userID, messageID string, retryAfter int) {
	payload := map[string]interface{}{
		"channel_id":  "",
		"retry_after": retryAfter,
	}
	if messageID != "" {
		payload["message_id"] = messageID
	}
	h.Send(userID, Message{Type: "slowmode_hit", Payload: payload})
}

func (h *Hub) Broadcast(msg Message) {
	humanData, payloadData, ok := h.marshalParts(msg)
	if !ok {
		return
	}
	intent := h.intentForEvent(msg.Type)
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, clients := range h.clients {
		for client := range clients {
			h.deliver(client, humanData, msg.Type, payloadData, intent)
		}
	}
}

func (h *Hub) BroadcastFiltered(msg Message, allow func(userID string) bool) {
	humanData, payloadData, ok := h.marshalParts(msg)
	if !ok {
		return
	}
	intent := h.intentForEvent(msg.Type)
	h.mu.RLock()
	type target struct {
		uid     string
		clients []*Client
	}
	targets := make([]target, 0, len(h.clients))
	for uid, cs := range h.clients {
		list := make([]*Client, 0, len(cs))
		for c := range cs {
			list = append(list, c)
		}
		targets = append(targets, target{uid, list})
	}
	h.mu.RUnlock()
	for _, t := range targets {
		if !allow(t.uid) {
			continue
		}
		for _, client := range t.clients {
			h.deliver(client, humanData, msg.Type, payloadData, intent)
		}
	}
}