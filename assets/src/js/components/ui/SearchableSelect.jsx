import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { ChevronIcon, SearchIcon, CheckIcon, CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';

const PANEL_EDGE = 8;

function findClippingBottom(el) {
  let node = el && el.parentElement;
  while (node && node !== document.body) {
    const s = getComputedStyle(node);
    if (s.overflowY === 'hidden' || s.overflowY === 'auto' || s.overflowY === 'scroll') {
      return node.getBoundingClientRect().bottom;
    }
    node = node.parentElement;
  }
  return window.innerHeight;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  renderOption,
  renderSelected,
  getLabel = (o) => o.label,
  getKey = (o) => o.value,
  disabled = false,
  clearable = false,
  searchable = true,
  className = '',
}) {
  const t = useT();
  const placeholderResolved = placeholder ?? t('ui.select_default_placeholder');
  const searchPlaceholderResolved = searchPlaceholder ?? t('ui.select_default_search');
  const emptyTextResolved = emptyText ?? t('ui.select_default_empty');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelMaxH, setPanelMaxH] = useState(280);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find(o => getKey(o) === value);

  const filtered = query.trim() === '' ? options : options.filter(o =>
    getLabel(o).toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handleDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const measure = () => {
      const trigger = rootRef.current;
      if (!trigger) return;
      const triggerBottom = trigger.getBoundingClientRect().bottom;
      const clipBottom = findClippingBottom(trigger);
      const available = clipBottom - triggerBottom - PANEL_EDGE;
      setPanelMaxH(Math.max(80, available));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      if (searchable && inputRef.current) {
        inputRef.current.focus();
      } else if (panelRef.current) {
        panelRef.current.focus();
      }
      setActiveIndex(0);
    } else {
      setQuery('');
    }
  }, [open, searchable]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[activeIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) {
        onChange(getKey(item), item);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }, [filtered, activeIndex, onChange, getKey]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`tw-input w-full px-3 py-2 flex items-center gap-2 text-left ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="flex-1 min-w-0 truncate">
          {selected
            ? (renderSelected ? renderSelected(selected) : getLabel(selected))
            : <span className="text-white/20">{placeholderResolved}</span>}
        </span>
        {clearable && selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange('', null); }}
            className="text-white/30 hover:text-white/60 flex-shrink-0"
            aria-label={t('ui.select_clear_aria')}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronIcon className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          onKeyDown={searchable ? undefined : handleKey}
          style={{ maxHeight: `${panelMaxH}px` }}
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-popover)] border border-white/[0.08] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden focus:outline-none animate-popover-in"
        >
          {searchable && (
            <div className="relative p-2 border-b border-white/[0.06] flex-shrink-0">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                onKeyDown={handleKey}
                placeholder={searchPlaceholderResolved}
                className="w-full bg-[var(--bg-tertiary)] border border-white/[0.06] rounded-md pl-8 pr-2 py-1.5 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-white/15"
              />
            </div>
          )}
          <div ref={listRef} className="overflow-y-auto overscroll-contain py-1 min-h-0 flex-1 scrollbar-dropdown">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-white/25 text-center">{emptyTextResolved}</div>
            ) : filtered.map((opt, i) => {
              const key = getKey(opt);
              const isActive = i === activeIndex;
              const isSelected = key === value;
              return (
                <button
                  key={key || '_empty_'}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(key, opt); setOpen(false); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                >
                  <span className="flex-1 min-w-0 truncate">
                    {renderOption ? renderOption(opt, { active: isActive, selected: isSelected }) : getLabel(opt)}
                  </span>
                  {isSelected && <CheckIcon className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}