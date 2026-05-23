package websocket

import (
	"encoding/json"
	"time"
)

const (
	OpDispatch       = 0
	OpHeartbeat      = 1
	OpIdentify       = 2
	OpResume         = 6
	OpReconnect      = 7
	OpInvalidSession = 9
	OpHello          = 10
	OpHeartbeatAck   = 11

	HeartbeatInterval = 41250 * time.Millisecond
	HeartbeatTimeout  = 2 * HeartbeatInterval

	// Close codes. Roughly mirror Discord's 4000-block:
	//   4001 banned (set elsewhere)
	//   4004 authentication failed (set elsewhere — bad/rotated token)
	//   4007 invalid seq passed in RESUME — client must re-IDENTIFY
	//   4009 heartbeat timeout / session expired past resume window
	//   4010 bot protocol violation — client sent a malformed/invalid
	//        request the server can't recover from (e.g. duplicate
	//        command names in registration). Client must fix its code;
	//        reconnecting unchanged will just hit the same error.
	CloseInvalidSeq         = 4007
	CloseHeartbeatTimeout   = 4009
	CloseProtocolViolation  = 4010
)

type BotFrame struct {
	Op       int             `json:"op"`
	Data     json.RawMessage `json:"d,omitempty"`
	Sequence int64           `json:"s,omitempty"`
	Type     string          `json:"t,omitempty"`
}

type HelloData struct {
	HeartbeatInterval int64 `json:"heartbeat_interval"`
}

func marshalBotFrame(op int, eventType string, payload interface{}) ([]byte, error) {
	frame := BotFrame{Op: op, Type: eventType}
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		frame.Data = data
	}
	return json.Marshal(frame)
}