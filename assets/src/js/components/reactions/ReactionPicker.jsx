import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { useDefaultEmojis, useGuildEmojiSet, useCategoryIcons } from '../emoji';
import { useGuilds } from '../../hooks/useGuilds';
import { u } from '../../api/routes';
import Tooltip from '../ui/Tooltip';
import EmojiTooltip from '../ui/EmojiTooltip';

const PICKER_WIDTH = 360;
const PICKER_MAX_HEIGHT = 440;
const PICKER_GAP = 8;
const SIDEBAR_WIDTH = 44;
const SIDEBAR_ICON = 32;
const PICKER_EMOJI_PX = 26;
const NARROW_WIDTH_FALLBACK = 16;
const MOBILE_BREAKPOINT = 640;

const DEFAULT_CATEGORY_ORDER = ['smileys', 'people', 'animals', 'food', 'activities', 'travel', 'objects', 'symbols', 'flags'];
function initials(name) {
  if (!name) return '?';
  const words = String(name).trim().split(/\s+/).slice(0, 2);
  return words.map(w => w[0] || '').join('').toUpperCase() || '?';
}

export default function ReactionPicker({ onSelect, onClose, pointerX, pointerY, guildId }) {
  const t = useT();
  const defaults = useDefaultEmojis();
  const categoryIcons = useCategoryIcons();
  const { guilds } = useGuilds();
  const scopedGuildIds = useMemo(() => (guildId ? [guildId] : []), [guildId]);
  const guildEmojiSet = useGuildEmojiSet(scopedGuildIds);
  const [activeSection, setActiveSection] = useState(null);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  const sections = useMemo(() => {
    const out = [];
    const byCategory = new Map();
    for (const em of defaults.byId.values()) {
      const cat = em.category || 'objects';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(em);
    }
    for (const cat of DEFAULT_CATEGORY_ORDER) {
      const items = byCategory.get(cat);
      if (!items || items.length === 0) continue;
      out.push({
        id: `__cat__${cat}`,
        label: t(`reactions.category_${cat}`),
        items,
        kind: 'default',
        firstEmojiId: categoryIcons[cat] || items[0]?.id,
      });
    }
    if (guildId) {
      const currentGuild = (guilds || []).find(g => g.id === guildId);
      const e = currentGuild && guildEmojiSet[guildId];
      if (currentGuild && e) {
        const items = Array.from(e.byId.values());
        if (items.length > 0) {
          out.push({
            id: guildId,
            label: currentGuild.name,
            items,
            kind: 'guild',
            guild: currentGuild,
            firstEmojiId: items[0]?.id,
          });
        }
      }
    }
    return out;
  }, [defaults.byId, guildEmojiSet, guilds, guildId, t, categoryIcons]);

  useEffect(() => {
    if (sections.length === 0) return;
    if (!activeSection || !sections.find(s => s.id === activeSection)) {
      const preferred = guildId && sections.find(s => s.id === guildId);
      setActiveSection(preferred ? preferred.id : sections[0].id);
    }
  }, [sections, activeSection, guildId]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;

  const pos = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (isMobile) {
      const width = Math.min(vw - 16, PICKER_WIDTH);
      const maxHeight = Math.min(vh - 16, PICKER_MAX_HEIGHT);
      return { left: (vw - width) / 2, top: (vh - maxHeight) / 2, width, maxHeight };
    }
    if (pointerX == null || pointerY == null) return null;
    const width = Math.min(PICKER_WIDTH, vw - NARROW_WIDTH_FALLBACK);
    const maxHeight = Math.min(PICKER_MAX_HEIGHT, vh - NARROW_WIDTH_FALLBACK);
    let left = pointerX + PICKER_GAP;
    if (left + width + PICKER_GAP > vw) left = pointerX - width - PICKER_GAP;
    if (left < PICKER_GAP) left = PICKER_GAP;
    let top = pointerY + PICKER_GAP;
    if (top + maxHeight + PICKER_GAP > vh) top = vh - maxHeight - PICKER_GAP;
    if (top < PICKER_GAP) top = PICKER_GAP;
    return { left, top, width, maxHeight };
  }, [pointerX, pointerY, isMobile]);

  useEffect(() => { if (!isMobile) searchRef.current?.focus(); }, [isMobile]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [onClose]);

  const activeData = useMemo(() => sections.find(s => s.id === activeSection), [sections, activeSection]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeData?.items || [];
    const all = sections.flatMap(s => s.items);
    return all.filter(em => em.name.toLowerCase().includes(q));
  }, [search, activeData, sections]);

  const handleSelect = useCallback((em) => { onSelect(em.id, em.name); }, [onSelect]);

  const pickerClass = 'fixed bg-[var(--bg-popover)] border border-[var(--border-default)] rounded-md shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] z-[9999] animate-popover-in flex flex-col overflow-hidden';

  const pickerStyle = pos
    ? { width: pos.width + 'px', maxHeight: pos.maxHeight + 'px', height: isMobile ? pos.maxHeight + 'px' : undefined, left: pos.left + 'px', top: pos.top + 'px' }
    : { width: PICKER_WIDTH + 'px', maxHeight: PICKER_MAX_HEIGHT + 'px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const renderSidebarIcon = (sec) => {
    if (sec.kind === 'guild') {
      if (sec.guild?.icon) {
        return <img src={u.guildAvatar(sec.guild.icon)} alt={sec.label} className="w-7 h-7 rounded-md object-cover" />;
      }
      return (
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-float)] text-[10px] font-semibold text-[rgb(var(--content-base)/0.75)]">
          {initials(sec.label)}
        </div>
      );
    }
    if (sec.firstEmojiId) {
      return <img src={u.emoji(sec.firstEmojiId)} alt={sec.label} className="w-6 h-6" />;
    }
    return <span className="text-[16px]">😀</span>;
  };

  return (
    <div ref={ref} className={pickerClass} style={pickerStyle}>
      <div className="px-2.5 pt-2 pb-1.5 border-b border-[var(--border-default)] flex-shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('reactions.search_placeholder')}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[rgb(var(--content-base)/0.20)] focus:outline-none focus:border-[var(--border-strong)] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--content-base)/0.20)] hover:text-[rgb(var(--content-base)/0.40)]">
              <CloseIcon className="w-3 h-3" />
            </button>
          )}
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-1 rounded-md text-[rgb(var(--content-base)/0.40)] hover:text-[rgb(var(--content-base)/0.95)] hover:bg-[var(--bg-float)]">
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex flex-1 min-h-0">
        {!search && sections.length > 1 && (
          <div className="flex flex-col gap-1 p-1.5 border-r border-[var(--border-subtle)] overflow-y-auto" style={{ width: SIDEBAR_WIDTH, flexShrink: 0 }}>
            {sections.map(sec => (
              <Tooltip key={sec.id} text={sec.label} placement="right">
                <button
                  onClick={() => setActiveSection(sec.id)}
                  aria-label={sec.label}
                  className={`flex items-center justify-center rounded-md transition-colors duration-100 select-none ${activeSection === sec.id ? 'bg-[rgb(var(--accent-rgb)/0.18)]' : 'opacity-60 hover:opacity-100 hover:bg-[var(--bg-float)]'}`}
                  style={{ height: SIDEBAR_ICON, width: SIDEBAR_ICON, flexShrink: 0 }}
                >
                  {renderSidebarIcon(sec)}
                </button>
              </Tooltip>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain p-2 min-h-0">
          {!search && activeData && (
            <p className="text-[10px] font-semibold text-[rgb(var(--content-base)/0.40)] uppercase tracking-wider px-1 pb-1.5 sticky top-0 bg-[var(--bg-popover)] z-10">{activeData.label}</p>
          )}
          {search && (
            <p className="text-[10px] font-semibold text-[rgb(var(--content-base)/0.40)] uppercase tracking-wider px-1 pb-1.5">{t('reactions.search_results')}</p>
          )}
          <div className="grid gap-0.5 grid-cols-7">
            {filtered.map((em) => {
              const emojiGuild = em.guild_id ? (guilds || []).find(g => g.id === em.guild_id) : null;
              return (
                <EmojiTooltip key={em.id} emoji={em} guild={emojiGuild}>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(em); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleSelect(em); }}
                    aria-label={`:${em.name}:`}
                    className="aspect-square flex items-center justify-center rounded-md hover:bg-[var(--bg-float)] active:bg-[rgb(var(--accent-rgb)/0.16)] transition-colors duration-75 select-none"
                  >
                    <img src={u.emoji(em.id)} alt={`:${em.name}:`} style={{ width: PICKER_EMOJI_PX, height: PICKER_EMOJI_PX }} />
                  </button>
                </EmojiTooltip>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="text-center text-xs text-[var(--text-secondary)] py-6">{t('reactions.no_results')}</p>}
        </div>
      </div>
    </div>
  );
}