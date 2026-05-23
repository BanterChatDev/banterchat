import { useEffect, useRef, useCallback } from 'react';
import { emit, toEventKey } from '../eventBus';
import { u } from '../api/routes';

export function useSocket(user) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);
  const userRef = useRef(user);
  userRef.current = user;
  const queueRef = useRef([]);
  const queueTimerRef = useRef(null);
  const hiddenAtRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (!userRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}${u.ws()}`);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      const queued = queueRef.current.splice(0);
      queued.forEach(e => ws.send(JSON.stringify(e.packet)));
      if (queueTimerRef.current) { clearInterval(queueTimerRef.current); queueTimerRef.current = null; }
      emit('reconnect', {});
      window.dispatchEvent(new CustomEvent('wsReconnect'));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'interaction_error') console.error('[ws] interaction_error', msg.payload);
        if (msg.type) emit(toEventKey(msg.type), msg.payload);
      } catch (err) {
        console.error('[ws] bad frame', err, e.data);
      }
    };

    ws.onclose = (ev) => {
      wsRef.current = null;
      console.warn('[ws] close', { code: ev.code, reason: ev.reason, attempts: attemptsRef.current });
      if (ev.code === 1008 && ev.reason) {
        window.dispatchEvent(new CustomEvent('appNotification', { detail: { message: ev.reason, type: 'warn' } }));
      }
      attemptsRef.current++;
      if (attemptsRef.current >= 3) {
        fetch(u.me(), { credentials: 'same-origin' }).then(r => {
          if (r.status === 401 || r.status === 403) {
            emit('forceLogout', {});
            window.dispatchEvent(new CustomEvent('wsForceLogout'));
            return;
          }
          const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 3000);
          reconnectRef.current = setTimeout(connect, delay);
        }).catch(() => {
          const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 3000);
          reconnectRef.current = setTimeout(connect, delay);
        });
      } else {
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 3000);
        reconnectRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => { console.error('[ws] error', err); ws.close(); };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  useEffect(() => {
    if (user && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) connect();
    if (!user && wsRef.current) wsRef.current.close();
  }, [user, connect]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      if (!userRef.current) return;
      const ws = wsRef.current;
      const away = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        attemptsRef.current = 0;
        connect();
      } else if (away > 5000) {
        emit('reconnect', {});
        window.dispatchEvent(new CustomEvent('wsReconnect'));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [connect]);

  window.__wsConnected = () => !!(wsRef.current && wsRef.current.readyState === WebSocket.OPEN);

  window.__wsSend = (obj) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
      return 'sent';
    }
    queueRef.current.push({ packet: obj, time: Date.now() });
    if (!queueTimerRef.current) {
      queueTimerRef.current = setInterval(() => {
        const now = Date.now();
        const expired = queueRef.current.filter(e => now - e.time > 5000);
        queueRef.current = queueRef.current.filter(e => now - e.time <= 5000);
        expired.forEach(e => window.dispatchEvent(new CustomEvent('wsQueueFail', { detail: e.packet })));
        if (queueRef.current.length === 0) { clearInterval(queueTimerRef.current); queueTimerRef.current = null; }
      }, 1000);
    }
    return 'queued';
  };

  return wsRef;
}
