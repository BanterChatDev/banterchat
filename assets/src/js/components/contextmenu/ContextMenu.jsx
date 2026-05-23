import React, { useRef, useEffect, useState } from 'react';
import GlassShine from '../theme/GlassShine';

const POPOVER_EXIT_MS = 180;
const EDGE_GAP = 8;

export default function ContextMenu({ x, y, items, width, onClose, isExiting }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y, flipX: false, flipY: false });

  useEffect(() => {
    if (!ref.current) return;
    const reposition = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const overflowsRight = x + rect.width > window.innerWidth - EDGE_GAP;
      const overflowsBottom = y + rect.height > window.innerHeight - EDGE_GAP;
      const flipX = overflowsRight && x - rect.width >= EDGE_GAP;
      const flipY = overflowsBottom && y - rect.height >= EDGE_GAP;
      const nx = flipX
        ? x - rect.width
        : overflowsRight
          ? Math.max(EDGE_GAP, window.innerWidth - rect.width - EDGE_GAP)
          : x;
      const ny = flipY
        ? y - rect.height
        : overflowsBottom
          ? Math.max(EDGE_GAP, window.innerHeight - rect.height - EDGE_GAP)
          : y;
      setPos({ x: nx, y: ny, flipX, flipY });
    };
    reposition();
    const ro = new ResizeObserver(reposition);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [x, y]);

  const origin = `${pos.flipY ? 'bottom' : 'top'} ${pos.flipX ? 'right' : 'left'}`;
  const style = { left: pos.x, top: pos.y, transformOrigin: origin };
  if (width) style.width = width;

  const animClass = isExiting ? 'animate-popover-out' : 'animate-popover-in';

  return (
    <div
      ref={ref}
      className={`fixed z-[100] overflow-hidden ${width ? '' : 'min-w-[200px]'} bg-[var(--bg-popover)] border border-[var(--border-subtle)] rounded-md shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] p-1 ${animClass}`}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <GlassShine />
      <div className="relative z-[1]">
      {items.map((item, i) =>
        item.separator ? (
          <div key={`sep-${i}`} className="my-1 mx-1.5 h-px bg-[var(--border-default)]" />
        ) : item.header ? (
          <div key={`header-${i}`} onClick={(e) => e.stopPropagation()}>{item.header({ close: onClose })}</div>
        ) : (
          <button
            key={item.label}
            onClick={() => { item.action(); onClose(); }}
            className={`w-full text-left px-2 py-1.5 text-[13px] rounded-sm flex items-center gap-2 transition-colors duration-100 ${
              item.color
                ? 'hover:bg-[var(--bg-float)]'
                : item.danger
                  ? 'text-[rgb(var(--accent-danger-rgb)/0.85)] hover:text-white hover:bg-[rgb(var(--accent-danger-rgb)/0.85)]'
                  : 'text-[rgb(var(--content-base)/0.75)] hover:text-white hover:bg-[var(--accent)]'
            }`}
            style={item.color ? { color: item.color } : undefined}
          >
            {item.icon && <span className="w-4 h-4 flex items-center justify-center opacity-80 flex-shrink-0">{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
          </button>
        )
      )}
      </div>
    </div>
  );
}

export const CTX_MENU_EXIT_MS = POPOVER_EXIT_MS;