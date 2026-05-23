import { useEffect, useRef } from 'react';
import { apiSetPresenceStatus } from '../api/users';

const IDLE_AFTER_MS = 10 * 60 * 1000;

export function useIdleDetection(user) {
  const lastActivityRef = useRef(Date.now());
  const isIdleRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!user) return undefined;

    const onActivity = () => {
      lastActivityRef.current = Date.now();
      const u = userRef.current;
      if (isIdleRef.current && u && (u.presence_status === 'idle' || !u.presence_status)) {
        isIdleRef.current = false;
        apiSetPresenceStatus('online').catch(() => {});
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') onActivity();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'];
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);

    const interval = setInterval(() => {
      const u = userRef.current;
      if (!u) return;
      const manual = u.presence_status;
      if (manual === 'dnd' || manual === 'invisible') return;
      if (isIdleRef.current) return;
      const since = Date.now() - lastActivityRef.current;
      if (since >= IDLE_AFTER_MS) {
        isIdleRef.current = true;
        apiSetPresenceStatus('idle').catch(() => {});
      }
    }, 30 * 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, [user?.id]);
}