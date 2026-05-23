package websocket

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

func (h *Hub) HandleConnect(c echo.Context) error {
	if isBot, _ := c.Get("isBot").(bool); isBot {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "bots must connect to /api/v1/bot/gateway"})
	}
	userID := c.Get("userID").(string)
	sessionID, _ := c.Get("sessionID").(string)
	clientType := "web"
	if c.Request().Header.Get("X-Banter-Client") == "desktop" {
		clientType = "desktop"
	}
	conn, err := h.upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return nil
	}
	client := h.Register(userID, sessionID, false, 0, clientType, conn)
	if client == nil {
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, ErrTooManyConns.Error()))
		conn.Close()
		return nil
	}
	go client.WritePump()
	go client.ReadPump()
	return nil
}

func (h *Hub) HandleBotConnect(c echo.Context) error {
	isBot, _ := c.Get("isBot").(bool)
	if !isBot {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "bot token required"})
	}
	userID := c.Get("userID").(string)
	var intents int64
	if v := c.QueryParam("intents"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			intents = n
		}
	}
	conn, err := h.botUpgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return nil
	}
	resumeID := c.QueryParam("session_id")
	resumeSeq := int64(-1)
	if v := c.QueryParam("seq"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			resumeSeq = n
		}
	}
	if resumeID != "" && resumeSeq >= 0 && h.resumeBotConnect(conn, userID, intents, resumeID, resumeSeq) {
		return nil
	}
	sessionID := newSessionID()
	client := h.Register(userID, sessionID, true, intents, "bot", conn)
	if client == nil {
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, ErrTooManyConns.Error()))
		conn.Close()
		return nil
	}
	client.markHeartbeat()
	h.sendHello(client)
	if h.OnBotConnect != nil {
		safeSend := func(data []byte) {
			select {
			case client.send <- data:
			case <-client.done:
			default:
			}
		}
		go func() {
			h.OnBotConnect(client.userID, sessionID, safeSend)
			h.registerBotSession(sessionID, userID, intents, client)
		}()
	}
	go client.WritePump()
	go client.ReadPump()
	go client.heartbeatReaper()
	return nil
}

func (h *Hub) resumeBotConnect(conn *websocket.Conn, userID string, intents int64, sessionID string, fromSeq int64) bool {
	entry, ok := h.lookupBotSession(sessionID, userID, fromSeq)
	if !ok {
		invalid, _ := marshalBotFrame(OpInvalidSession, "", false)
		if invalid != nil {
			conn.WriteMessage(websocket.TextMessage, invalid)
		}
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(CloseInvalidSeq, "resume seq evicted"))
		conn.Close()
		return true
	}
	client := h.Register(userID, sessionID, true, intents, "bot", conn)
	if client == nil {
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, ErrTooManyConns.Error()))
		conn.Close()
		return true
	}
	client.seqMu.Lock()
	client.seq = entry.seq
	client.lastAckedSeq = fromSeq
	client.replayBuf = append(client.replayBuf, entry.replay...)
	client.trimReplayLocked()
	pending, _ := client.replayAfter(fromSeq)
	client.seqMu.Unlock()
	client.markHeartbeat()
	h.sendHello(client)
	for _, ev := range pending {
		select {
		case client.send <- ev.data:
		case <-client.done:
		default:
		}
	}
	h.registerBotSession(sessionID, userID, intents, client)
	go client.WritePump()
	go client.ReadPump()
	go client.heartbeatReaper()
	return true
}

func (h *Hub) sendHello(client *Client) {
	hello, err := marshalBotFrame(OpHello, "", HelloData{HeartbeatInterval: HeartbeatInterval.Milliseconds()})
	if err != nil {
		return
	}
	select {
	case client.send <- hello:
	case <-client.done:
	default:
	}
}

func newSessionID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return hex.EncodeToString(b[:])
}