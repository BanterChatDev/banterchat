package websocket

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	hub           *Hub
	conn          *websocket.Conn
	userID        string
	sessionID     string
	isBot         bool
	intents       int64
	clientType    string
	send          chan []byte
	closeCh       chan []byte
	// done is closed exactly once by Unregister to signal shutdown.
	// Every send-to-client site selects on <-done so it never sends
	// into a channel that could be closed. send itself is never closed.
	done          chan struct{}
	closeOnce     sync.Once
	heartbeatMu   sync.Mutex
	lastHeartbeat time.Time

	// Sequence + replay state — bot clients only. For humans these stay
	// zero-valued; the dispatch path checks isBot before touching them.
	//
	// seq is the per-session monotonic counter assigned to every
	// dispatch frame this client receives. Stored under seqMu so
	// concurrent emitToUserSet goroutines can't race.
	//
	// lastAckedSeq is the most recent seq the client reported via
	// heartbeat. Used to prune the replay buffer on the fly so the
	// memory ceiling doesn't drift unbounded for slow-acking bots.
	//
	// replayBuf is a bounded ring of recent dispatch frames keyed by
	// seq. On RESUME we walk this from (resume_seq+1) to seq and
	// re-deliver. Frames older than the oldest entry → can't resume,
	// client must re-IDENTIFY.
	seqMu        sync.Mutex
	seq          int64
	lastAckedSeq int64
	replayBuf    []bufferedEvent
}

// bufferedEvent is one entry in Client.replayBuf — enough to replay a
// dispatch frame verbatim without re-marshalling. Stored as the
// already-wire-formatted byte slice plus its seq for indexed lookup.
type bufferedEvent struct {
	seq  int64
	data []byte
}

// signalDone closes c.done exactly once. Safe to call from multiple
// goroutines (e.g. WritePump error path + Unregister).
func (c *Client) signalDone() {
	c.closeOnce.Do(func() { close(c.done) })
}

func (c *Client) markHeartbeat() {
	c.heartbeatMu.Lock()
	c.lastHeartbeat = time.Now()
	c.heartbeatMu.Unlock()
}

func (c *Client) heartbeatAge() time.Duration {
	c.heartbeatMu.Lock()
	defer c.heartbeatMu.Unlock()
	if c.lastHeartbeat.IsZero() {
		return 0
	}
	return time.Since(c.lastHeartbeat)
}

func (c *Client) heartbeatReaper() {
	ticker := time.NewTicker(HeartbeatInterval)
	defer ticker.Stop()
	for {
		select {
		case <-c.done:
			return
		case <-ticker.C:
			if c.heartbeatAge() > HeartbeatTimeout {
				select {
				case c.closeCh <- websocket.FormatCloseMessage(CloseHeartbeatTimeout, "heartbeat timeout"):
				default:
				}
				return
			}
		}
	}
}

func (c *Client) handleBotPacket(raw []byte) bool {
	if !c.isBot {
		return false
	}
	var frame BotFrame
	if err := json.Unmarshal(raw, &frame); err != nil {
		return false
	}
	switch frame.Op {
	case OpHeartbeat:
		// Discord ships the client's last-known sequence in d. We
		// record it on the client so a subsequent RESUME from the
		// same session can pick up where they left off even if the
		// underlying socket dies mid-flight. Heartbeats without a
		// payload (older SDKs) are still valid — markLastAckedSeq
		// no-ops on -1.
		c.markHeartbeat()
		c.markLastAckedSeq(parseHeartbeatSeq(frame.Data))
		ack, err := marshalBotFrame(OpHeartbeatAck, "", nil)
		if err == nil {
			select {
			case c.send <- ack:
			case <-c.done:
			default:
			}
		}
		return true
	case OpResume:
		// RESUME on an already-open socket is a protocol mistake —
		// RESUME is only valid as the first frame after a fresh
		// connect, and the hub's HandleBotConnect path handles
		// that case. Silently swallow so a buggy SDK doesn't crash
		// the read loop.
		return true
	}
	return false
}

// parseHeartbeatSeq pulls the integer sequence out of a heartbeat's
// d field. Discord's contract is "int last seq, or null if you
// haven't received any events". null/missing/non-int → -1 so the
// caller can treat "no info" distinctly from "explicitly seq 0".
func parseHeartbeatSeq(data json.RawMessage) int64 {
	if len(data) == 0 || string(data) == "null" {
		return -1
	}
	var n int64
	if err := json.Unmarshal(data, &n); err != nil {
		return -1
	}
	return n
}

func (c *Client) acceptsEvent(intent int64) bool {
	if !c.isBot {
		return true
	}
	if intent == 0 {
		return true
	}
	return c.intents&intent != 0
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(c.hub.cfg.ReadLimit)
	c.conn.SetReadDeadline(time.Now().Add(c.hub.cfg.PongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(c.hub.cfg.PongWait))
		return nil
	})
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		if c.hub.limiter != nil && !c.hub.limiter.AllowWS(c.userID) {
			select {
			case c.closeCh <- websocket.FormatCloseMessage(websocket.ClosePolicyViolation, ErrWSRateLimited.Error()):
			default:
			}
			break
		}
		if c.handleBotPacket(data) {
			continue
		}
		c.hub.RoutePacket(c.userID, data, c.done)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(c.hub.cfg.PingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
		// Trigger Unregister through signalDone so the registry
		// cleans up when the writer exits for any reason (network
		// error, close frame, ping failure).
		c.signalDone()
	}()
	for {
		select {
		case message := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(c.hub.cfg.WriteWait))
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
			// Drain queued messages opportunistically.
			n := len(c.send)
			for i := 0; i < n; i++ {
				if err := c.conn.WriteMessage(websocket.TextMessage, <-c.send); err != nil {
					return
				}
			}
		case msg := <-c.closeCh:
			c.conn.SetWriteDeadline(time.Now().Add(c.hub.cfg.WriteWait))
			c.conn.WriteMessage(websocket.CloseMessage, msg)
			return
		case <-c.done:
			// Registry says disconnect. Best-effort close frame.
			c.conn.SetWriteDeadline(time.Now().Add(c.hub.cfg.WriteWait))
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(c.hub.cfg.WriteWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

const replayBufferCap = 256

func (c *Client) assignSeq() int64 {
	if !c.isBot {
		return 0
	}
	c.seqMu.Lock()
	defer c.seqMu.Unlock()
	c.seq++
	return c.seq
}

func (c *Client) bufferFrame(seq int64, data []byte) {
	c.seqMu.Lock()
	defer c.seqMu.Unlock()
	c.replayBuf = append(c.replayBuf, bufferedEvent{seq: seq, data: data})
	c.trimReplayLocked()
}

func (c *Client) trimReplayLocked() {
	keepFrom := 0
	for i, ev := range c.replayBuf {
		if ev.seq > c.lastAckedSeq {
			keepFrom = i
			break
		}
		keepFrom = i + 1
	}
	if keepFrom > 0 {
		c.replayBuf = c.replayBuf[keepFrom:]
	}
	if overflow := len(c.replayBuf) - replayBufferCap; overflow > 0 {
		c.replayBuf = c.replayBuf[overflow:]
	}
}

func (c *Client) markLastAckedSeq(seq int64) {
	if seq < 0 {
		return
	}
	c.seqMu.Lock()
	if seq > c.lastAckedSeq {
		c.lastAckedSeq = seq
	}
	c.trimReplayLocked()
	c.seqMu.Unlock()
}

func (c *Client) replayAfter(seq int64) ([]bufferedEvent, bool) {
	c.seqMu.Lock()
	defer c.seqMu.Unlock()
	if len(c.replayBuf) == 0 {
		return nil, seq == c.seq
	}
	if seq+1 < c.replayBuf[0].seq {
		return nil, false
	}
	out := make([]bufferedEvent, 0, len(c.replayBuf))
	for _, ev := range c.replayBuf {
		if ev.seq > seq {
			out = append(out, ev)
		}
	}
	return out, true
}