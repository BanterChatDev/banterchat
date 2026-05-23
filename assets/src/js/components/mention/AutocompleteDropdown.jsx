import React, { useEffect, useRef, useCallback } from 'react';

export default function AutocompleteDropdown({ title, items, itemKey, activeIndex, onSelect, onHover, renderItem }) {
  const listRef = useRef(null);
  const touchMoved = useRef(false);

  useEffect(() => {
    if (listRef.current && listRef.current.children[activeIndex]) {
      listRef.current.children[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleTouchStart = useCallback(() => { touchMoved.current = false; }, []);
  const handleTouchMove = useCallback(() => { touchMoved.current = true; }, []);
  const handleTouchEnd = useCallback((item) => (e) => {
    if (!touchMoved.current) {
      e.preventDefault();
      onSelect(item);
    }
  }, [onSelect]);

  if (!items || items.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-lg shadow-2xl shadow-black/40 z-50 max-h-[min(50vh,240px)] flex flex-col overflow-hidden animate-popover-in" onTouchMove={(e) => e.stopPropagation()}>
      <div className="px-3 py-2 border-b border-white/[0.04] flex-shrink-0">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{title}</span>
      </div>
      <div ref={listRef} className="overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch] min-h-0 flex-1 scrollbar-dropdown touch-pan-y">
        {items.map((item, i) => (
          <button
            key={typeof itemKey === 'function' ? itemKey(item) : item[itemKey || 'id']}
            onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd(item)}
            onMouseEnter={() => onHover(i)}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${i === activeIndex ? 'bg-[rgb(var(--accent-rgb)/0.15)]' : 'hover:bg-white/[0.04]'}`}
          >
            {renderItem(item, i)}
          </button>
        ))}
      </div>
    </div>
  );
}