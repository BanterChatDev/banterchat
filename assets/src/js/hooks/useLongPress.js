import { useRef, useCallback } from 'react';

export function useLongPress(onLongPress, { delay = 500, moveTolerance = 10 } = {}) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    firedRef.current = false;
    clear();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      const synthetic = {
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: startRef.current.x,
        clientY: startRef.current.y,
      };
      onLongPress(synthetic);
    }, delay);
  }, [onLongPress, delay, clear]);

  const onTouchMove = useCallback((e) => {
    if (!timerRef.current) return;
    if (!e.touches || e.touches.length !== 1) { clear(); return; }
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;
    if (dx * dx + dy * dy > moveTolerance * moveTolerance) clear();
  }, [clear, moveTolerance]);

  const onTouchEnd = useCallback((e) => {
    const fired = firedRef.current;
    clear();
    if (fired && e?.preventDefault) e.preventDefault();
  }, [clear]);

  const onTouchCancel = useCallback(() => { clear(); firedRef.current = false; }, [clear]);

  const onClickCapture = useCallback((e) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;
    }
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onClickCapture };
}