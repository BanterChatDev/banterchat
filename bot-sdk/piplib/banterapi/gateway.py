import asyncio
import json

import websockets

from .errors import GatewayError, LoginFailure
from .logger import Logger


log = Logger(__name__)


OP_DISPATCH = 0
OP_HEARTBEAT = 1
OP_RESUME = 6
OP_RECONNECT = 7
OP_INVALID_SESSION = 9
OP_HELLO = 10
OP_HEARTBEAT_ACK = 11

CLOSE_INVALID_SEQ = 4007
CLOSE_HEARTBEAT_TIMEOUT = 4009


def _headers_kwarg():
    try:
        from inspect import signature
        params = signature(websockets.connect).parameters
    except Exception:
        return "additional_headers"
    if "additional_headers" in params:
        return "additional_headers"
    if "extra_headers" in params:
        return "extra_headers"
    return "additional_headers"


class Gateway:

    def __init__(self, token, intents, ws_url, dispatcher, resume=None):
        self.token = token
        self.intents = int(intents)
        self.ws_url = ws_url
        self.dispatcher = dispatcher
        self._ws = None
        self._closed = False
        self._heartbeat_task = None
        self._heartbeat_interval = None
        self._last_ack = True
        self.close_code = None
        self.close_reason = ""
        self.last_seq = -1
        self.invalid_session = False
        self._resume = resume

    async def connect(self):
        url = f"{self.ws_url}?intents={self.intents}"
        if self._resume:
            sid, seq = self._resume
            if sid and seq >= 0:
                url += f"&session_id={sid}&seq={seq}"
        kwargs = {
            _headers_kwarg(): {
                "Authorization": f"Bot {self.token}",
                "User-Agent": "BanterPy/0.1",
            },
            "ping_interval": 20,
            "ping_timeout": 20,
        }
        try:
            self._ws = await websockets.connect(url, **kwargs)
        except Exception as e:
            name = type(e).__name__
            if name in ("InvalidStatus", "InvalidStatusCode"):
                status = 0
                resp = getattr(e, "response", None)
                if resp is not None:
                    status = getattr(resp, "status_code", 0)
                if status == 0:
                    status = getattr(e, "status_code", 0)
                if status == 401:
                    raise LoginFailure("invalid bot token")
                raise GatewayError(f"connect failed: HTTP {status}")
            raise GatewayError(f"connect failed: {e}")

    async def _heartbeat_loop(self):
        try:
            while not self._closed:
                await asyncio.sleep(self._heartbeat_interval / 1000)
                if not self._last_ack:
                    try:
                        await self._ws.close(code=4000, reason="missed heartbeat ack")
                    except Exception:
                        log.debug("heartbeat: socket already gone on close-after-miss")
                    return
                self._last_ack = False
                try:
                    payload = self.last_seq if self.last_seq >= 0 else None
                    await self._ws.send(json.dumps({"op": OP_HEARTBEAT, "d": payload}))
                except Exception as e:
                    log.info("heartbeat send failed: %s", e)
                    return
        except asyncio.CancelledError:
            return

    async def run(self):
        if self._ws is None:
            raise GatewayError("not connected")
        try:
            async for raw in self._ws:
                if self._closed:
                    return
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError as e:
                    log.info("gateway: dropping non-JSON frame: %s", e)
                    continue

                if isinstance(msg, dict) and "op" in msg:
                    op = msg.get("op")
                    log.debug("gateway frame op=%s t=%s s=%s", op, msg.get("t"), msg.get("s"))
                    if op == OP_HELLO:
                        d = msg.get("d") or {}
                        self._heartbeat_interval = int(d.get("heartbeat_interval", 41250))
                        self._last_ack = True
                        if self._heartbeat_task is None or self._heartbeat_task.done():
                            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
                        continue
                    if op == OP_HEARTBEAT_ACK:
                        self._last_ack = True
                        continue
                    if op == OP_DISPATCH:
                        seq = msg.get("s")
                        if isinstance(seq, int) and seq > self.last_seq:
                            self.last_seq = seq
                        event_type = msg.get("t") or ""
                        payload = msg.get("d") or {}
                        log.debug("gateway dispatch event=%s payload_keys=%s", event_type, list(payload.keys()) if isinstance(payload, dict) else type(payload).__name__)
                        await self.dispatcher(event_type, payload)
                        continue
                    if op == OP_INVALID_SESSION:
                        self.invalid_session = True
                        try:
                            await self._ws.close(code=4000, reason="invalid session")
                        except Exception:
                            pass
                        return
                    if op == OP_RECONNECT:
                        try:
                            await self._ws.close(code=4000, reason="server requested reconnect")
                        except Exception:
                            pass
                        return
                    log.debug("gateway: unknown opcode %r — ignored", op)
                    continue

                event_type = msg.get("type", "")
                payload = msg.get("payload", {})
                await self.dispatcher(event_type, payload)
        except websockets.exceptions.ConnectionClosed as e:
            self.close_code = getattr(e, "code", None)
            self.close_reason = getattr(e, "reason", "") or ""
            return
        except Exception as e:
            raise GatewayError(f"gateway read loop failed: {e}") from e

    async def close(self):
        self._closed = True
        if self._heartbeat_task is not None and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
        if self._ws is None:
            return
        closed = False
        state = getattr(self._ws, "closed", None)
        if state is not None:
            closed = bool(state)
        if not closed:
            try:
                await self._ws.close()
            except Exception as e:
                log.debug("gateway close ignored teardown error: %s", e)