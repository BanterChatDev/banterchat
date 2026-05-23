import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const EDGE = 8;

export default function DropdownMenu({
  anchorRef,
  onClose,
  children,
  width = 200,
  align = 'left',
  className = '',
}) {
  const popRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const measure = useCallback(() => {
    const anchor = anchorRef?.current;
    const pop = popRef.current;
    if (!anchor || !pop) return;
    const a = anchor.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const popH = popRect.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, vw - EDGE * 2);

    const spaceAbove = a.top - GAP - EDGE;
    const spaceBelow = vh - a.bottom - GAP - EDGE;
    const fitsAbove = popH <= spaceAbove;
    const fitsBelow = popH <= spaceBelow;

    let top;
    if (fitsAbove) {
      top = a.top - GAP - popH;
    } else if (fitsBelow) {
      top = a.bottom + GAP;
    } else if (spaceAbove >= spaceBelow) {
      top = EDGE;
    } else {
      top = Math.max(EDGE, vh - EDGE - popH);
    }

    let left = align === 'right' ? a.right - w : a.left;
    if (left < EDGE) left = EDGE;
    if (left + w > vw - EDGE) left = vw - EDGE - w;

    setCoords({ top, left, width: w });
  }, [anchorRef, width, align]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    let observer = null;
    if (popRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measure());
      observer.observe(popRef.current);
    }
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      if (observer) observer.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) &&
          (!anchorRef?.current || !anchorRef.current.contains(e.target))) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose, anchorRef]);

  if (typeof document === 'undefined') return null;

  const tree = (
    <div
      ref={popRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: coords ? coords.top : -9999,
        left: coords ? coords.left : -9999,
        width: coords ? coords.width : width,
      }}
      className={`bg-[var(--bg-secondary)] border border-white/[0.06] rounded-lg shadow-2xl shadow-black/40 z-[9999] overflow-hidden ${coords ? 'animate-popover-in' : 'opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
  return createPortal(tree, document.body);
}

export function DropdownItem({ icon, label, onClick, danger = false, disabled = false, active = false, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? 'text-red-400/85 hover:bg-red-500/10 hover:text-red-300'
          : active
            ? 'bg-[rgb(var(--accent-rgb)/0.15)] text-white/95'
            : 'text-white/85 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {trailing && <span className="flex-shrink-0">{trailing}</span>}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="h-px bg-white/[0.05] my-1 mx-3" aria-hidden="true" />;
}

export function DropdownLabel({ children }) {
  return <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">{children}</div>;
}