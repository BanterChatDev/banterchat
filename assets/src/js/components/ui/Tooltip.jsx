import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY_MS = 350;
const ARROW_SIZE = 5;
const EDGE_GAP = 8;
const TRIGGER_GAP = 8;

const PLACEMENTS = ['top', 'bottom', 'right', 'left'];

function pickPlacement(preferred, anchor, size, vw, vh) {
  const fits = (p) => {
    if (p === 'top') return anchor.top - TRIGGER_GAP - size.h >= EDGE_GAP;
    if (p === 'bottom') return anchor.bottom + TRIGGER_GAP + size.h <= vh - EDGE_GAP;
    if (p === 'left') return anchor.left - TRIGGER_GAP - size.w >= EDGE_GAP;
    if (p === 'right') return anchor.right + TRIGGER_GAP + size.w <= vw - EDGE_GAP;
    return false;
  };
  if (fits(preferred)) return preferred;
  const fallbacks = preferred === 'top' || preferred === 'bottom'
    ? [preferred === 'top' ? 'bottom' : 'top', 'right', 'left']
    : [preferred === 'left' ? 'right' : 'left', 'top', 'bottom'];
  for (const p of fallbacks) if (fits(p)) return p;
  return preferred;
}

function computeCoords(placement, anchor, size, vw, vh) {
  let left = 0;
  let top = 0;
  let arrowAxis = 'x';
  let arrowOffset = 0;
  if (placement === 'top') {
    top = anchor.top - TRIGGER_GAP - size.h;
    left = anchor.left + anchor.width / 2 - size.w / 2;
  } else if (placement === 'bottom') {
    top = anchor.bottom + TRIGGER_GAP;
    left = anchor.left + anchor.width / 2 - size.w / 2;
  } else if (placement === 'left') {
    left = anchor.left - TRIGGER_GAP - size.w;
    top = anchor.top + anchor.height / 2 - size.h / 2;
  } else if (placement === 'right') {
    left = anchor.right + TRIGGER_GAP;
    top = anchor.top + anchor.height / 2 - size.h / 2;
  }
  const minLeft = EDGE_GAP;
  const maxLeft = vw - size.w - EDGE_GAP;
  const minTop = EDGE_GAP;
  const maxTop = vh - size.h - EDGE_GAP;
  const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left));
  const clampedTop = Math.max(minTop, Math.min(maxTop, top));
  if (placement === 'top' || placement === 'bottom') {
    arrowAxis = 'x';
    arrowOffset = anchor.left + anchor.width / 2 - clampedLeft;
  } else {
    arrowAxis = 'y';
    arrowOffset = anchor.top + anchor.height / 2 - clampedTop;
  }
  return { left: clampedLeft, top: clampedTop, arrowAxis, arrowOffset };
}

function Arrow({ placement, axis, offset }) {
  const base = 'absolute w-0 h-0 border-transparent';
  if (placement === 'top') {
    return (
      <span
        className={`${base} border-l-[${ARROW_SIZE}px] border-l-transparent border-r-[${ARROW_SIZE}px] border-r-transparent border-t-[${ARROW_SIZE}px] border-t-[var(--bg-deepest)] top-full`}
        style={{ left: offset, transform: 'translateX(-50%)', borderLeftWidth: ARROW_SIZE, borderRightWidth: ARROW_SIZE, borderTopWidth: ARROW_SIZE, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'var(--bg-deepest)' }}
      />
    );
  }
  if (placement === 'bottom') {
    return (
      <span
        className={`${base} bottom-full`}
        style={{ left: offset, transform: 'translateX(-50%)', borderLeftWidth: ARROW_SIZE, borderRightWidth: ARROW_SIZE, borderBottomWidth: ARROW_SIZE, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'var(--bg-deepest)' }}
      />
    );
  }
  if (placement === 'left') {
    return (
      <span
        className={base}
        style={{ top: offset, left: '100%', transform: 'translateY(-50%)', borderTopWidth: ARROW_SIZE, borderBottomWidth: ARROW_SIZE, borderLeftWidth: ARROW_SIZE, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'var(--bg-deepest)' }}
      />
    );
  }
  return (
    <span
      className={base}
      style={{ top: offset, right: '100%', transform: 'translateY(-50%)', borderTopWidth: ARROW_SIZE, borderBottomWidth: ARROW_SIZE, borderRightWidth: ARROW_SIZE, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'var(--bg-deepest)' }}
    />
  );
}

export default function Tooltip({ text, content, children, placement = 'top', delayMs = SHOW_DELAY_MS, disabled = false, maxWidth = 240 }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const showTimer = useRef(null);
  const finalPlacement = useRef(placement);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tooltipRef.current;
    if (!trigger || !tip) return;
    const anchor = trigger.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const size = { w: tipRect.width, h: tipRect.height };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placed = pickPlacement(placement, anchor, size, vw, vh);
    finalPlacement.current = placed;
    setCoords(computeCoords(placed, anchor, size, vw, vh));
  }, [placement]);

  const show = useCallback(() => {
    if (disabled) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => setVisible(true), delayMs);
  }, [disabled, delayMs]);

  const hide = useCallback(() => {
    clearTimeout(showTimer.current);
    setVisible(false);
    setCoords(null);
  }, []);

  useEffect(() => () => clearTimeout(showTimer.current), []);

  useEffect(() => {
    if (!visible) return;
    measure();
    const onScroll = () => hide();
    const onResize = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [visible, measure, hide]);

  const node = useMemo(() => {
    if (!visible || (!text && !content)) return null;
    const placed = finalPlacement.current;
    const style = coords
      ? { left: coords.left, top: coords.top, maxWidth, opacity: 1 }
      : { left: -9999, top: -9999, maxWidth, opacity: 0 };
    return createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        className="fixed z-[1000] px-2.5 py-1.5 rounded-md bg-[var(--bg-deepest)] text-white text-[12px] font-medium shadow-lg pointer-events-none border border-white/[0.06] animate-popover-in"
        style={style}
      >
        {content || text}
        {coords && <Arrow placement={placed} axis={coords.arrowAxis} offset={coords.arrowOffset} />}
      </div>,
      document.body
    );
  }, [visible, coords, text, content, maxWidth]);

  if (!children) return null;
  const child = React.Children.only(children);
  const childRef = child.ref;
  const setRef = (el) => {
    triggerRef.current = el;
    if (typeof childRef === 'function') childRef(el);
    else if (childRef && typeof childRef === 'object') childRef.current = el;
  };

  const cloned = React.cloneElement(child, {
    ref: setRef,
    onMouseEnter: (e) => { show(); child.props.onMouseEnter && child.props.onMouseEnter(e); },
    onMouseLeave: (e) => { hide(); child.props.onMouseLeave && child.props.onMouseLeave(e); },
    onFocus: (e) => { show(); child.props.onFocus && child.props.onFocus(e); },
    onBlur: (e) => { hide(); child.props.onBlur && child.props.onBlur(e); },
  });

  return <>{cloned}{node}</>;
}