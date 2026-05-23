import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { ChevronIcon } from '../icons';

export default function FloatingWindow({
  title,
  subtitle,
  defaultPosition,
  size = { width: 280, height: 'auto' },
  bounds = 'window',
  collapsible = true,
  defaultCollapsed = false,
  headerLeft,
  headerRight,
  className = '',
  bodyClassName = '',
  children,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const initialPosition = defaultPosition || {
    x: typeof window !== 'undefined' ? window.innerWidth - 296 : 16,
    y: typeof window !== 'undefined' ? window.innerHeight - 240 : 16,
  };

  return (
    <Rnd
      default={{ ...initialPosition, ...size }}
      bounds={bounds}
      enableResizing={false}
      dragHandleClassName="floating-window-handle"
      style={{ zIndex: 50 }}
    >
      <div
        className={`bg-[var(--bg-secondary)] rounded-xl shadow-2xl border border-[var(--border-medium)] overflow-hidden select-none ${className}`}
      >
        <div className="floating-window-handle flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-tertiary)] cursor-move">
          {headerLeft}
          <div className="flex-1 min-w-0 text-[11px]">
            {title && <div className="font-semibold text-[var(--text-primary)] truncate">{title}</div>}
            {subtitle && <div className="text-white/45 truncate">{subtitle}</div>}
          </div>
          {headerRight}
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              className="w-6 h-6 flex items-center justify-center rounded text-white/55 hover:text-white hover:bg-white/[0.08]"
              aria-label={collapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronIcon className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          )}
        </div>
        {!collapsed && <div className={bodyClassName}>{children}</div>}
      </div>
    </Rnd>
  );
}