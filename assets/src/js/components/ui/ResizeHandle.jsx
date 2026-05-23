import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useT } from '../../hooks/useT';

export default function ResizeHandle({ currentWidth, onResize, onResizeEnd, direction = 'right', min = 100, max = 500, className = '' }) {
  const t = useT();
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const rafId = useRef(0);
  const onResizeRef = useRef(onResize);
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeRef.current = onResize;
  onResizeEndRef.current = onResizeEnd;

  const clamp = useCallback((x) => Math.round(Math.min(max, Math.max(min, x))), [min, max]);

  const begin = useCallback((clientX) => {
    startX.current = clientX;
    startW.current = currentWidth;
    setActive(true);
  }, [currentWidth]);

  const move = useCallback((clientX) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const delta = direction === 'right' ? clientX - startX.current : startX.current - clientX;
      onResizeRef.current(clamp(startW.current + delta));
    });
  }, [direction, clamp]);

  const end = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    setActive(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    onResizeEndRef.current?.();
  }, []);

  useEffect(() => {
    if (!active) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e) => move(e.clientX);
    const onTouchMove = (e) => { e.preventDefault(); move(e.touches[0].clientX); };
    const onMouseUp = end;
    const onTouchEnd = end;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [active, move, end]);

  const visible = active || hovered;
  const edgeOffset = direction === 'right' ? { left: -6 } : { right: -6 };

  return (
    <>
      {active && <div className="fixed inset-0 z-50" style={{ cursor: 'col-resize' }} />}
      <div
        className={`w-0 flex-shrink-0 relative ${className}`}
      >
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); begin(e.clientX); }}
          onTouchStart={(e) => { begin(e.touches[0].clientX); }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label={t('ui.resize_panel_aria')}
          className="absolute top-1/2 -translate-y-1/2 w-3 h-10 cursor-col-resize z-10 flex items-center justify-center group/rh bg-transparent border-0 p-0"
          style={edgeOffset}
        >
          <span
            className="block w-[3px] h-8 rounded-full transition-all duration-150 ease-out"
            style={{
              background: active
                ? 'rgb(var(--accent-rgb)/0.9)'
                : visible
                  ? 'rgb(var(--accent-rgb)/0.55)'
                  : 'rgb(255 255 255 / 0.14)',
              transform: active ? 'scaleY(1.15)' : 'scaleY(1)',
              boxShadow: active ? '0 0 8px rgb(var(--accent-rgb)/0.35)' : 'none',
            }}
          />
        </button>
      </div>
    </>
  );
}