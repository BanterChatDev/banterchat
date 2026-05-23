import React, { useState, useMemo } from 'react';
import { useGuilds } from '../../hooks/useGuilds';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import { useContextMenu } from '../contextmenu';
import { useLongPress } from '../../hooks/useLongPress';
import { PlusIcon, HomeIcon as SiteHomeIcon } from '../icons';
import { u } from '../../api/routes';
import UserAvatar from '../user/UserAvatar';
import { AvatarWithStatus } from '../status';
import { useT } from '../../hooks/useT';
import { DISCOVERY_URL } from '../../config';
import Tooltip from '../ui/Tooltip';

const VARIANTS = {
  desktop: {
    wrapClass: 'hidden lg:flex w-[72px]',
    btnSize: 'w-12 h-12',
    roundedActive: 'rounded-[16px]',
    roundedIdle: 'rounded-[24px]',
    pillActive: 'h-[36px]',
    pillUnread: 'h-[10px]',
    pillHoverGrow: 'h-0 group-hover:h-[18px]',
    rowH: 'h-[52px]',
    fontSize: 'text-[15px]',
    iconSize: 'w-5 h-5',
    reorder: true,
  },
  mobile: {
    wrapClass: 'lg:hidden flex w-[60px]',
    btnSize: 'w-11 h-11',
    roundedActive: 'rounded-[14px]',
    roundedIdle: 'rounded-[22px]',
    pillActive: 'h-[28px]',
    pillUnread: 'h-[8px]',
    pillHoverGrow: 'h-0',
    rowH: 'h-[48px]',
    fontSize: 'text-[13px]',
    iconSize: 'w-5 h-5',
    reorder: false,
  },
};

function GuildIcon({ g, initials, active, iconSize, fontSize }) {
  if (g.icon) return <img src={u.guildAvatar(g.icon)} alt="" className="w-full h-full object-cover" />;
  return <span className={`${fontSize} font-semibold leading-none select-none`}>{initials}</span>;
}

function GuildItem({ g, active, unread, mentions, vc, onClick, openMenu, user, draggable, dragHandlers, showInsertBar }) {
  const hasUnread = !active && unread > 0;
  const hasMention = mentions > 0;
  const longPress = useLongPress((ev) => openMenu(ev, { guild: g, user }));
  const initials = (g.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const dh = dragHandlers || {};
  return (
    <div className="w-full" onDragOver={dh.onDragOver} onDrop={dh.onDrop}>
      {showInsertBar && <div className="w-8 h-[2px] bg-white/30 rounded-full mx-auto" />}
      <Tooltip text={g.name} placement="right">
        <div className={`relative flex items-center justify-center w-full ${vc.rowH} group`} aria-label={g.name}>
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-white transition-all duration-200 ${
          active ? vc.pillActive : hasUnread ? vc.pillUnread : vc.pillHoverGrow
        }`} />
        <div className={`relative ${vc.btnSize} flex-shrink-0`}>
          <button
            draggable={draggable}
            onDragStart={dh.onDragStart}
            onDragEnd={dh.onDragEnd}
            onClick={onClick}
            onContextMenu={(e) => { e.preventDefault(); openMenu(e, { guild: g, user }); }}
            onTouchStart={longPress.onTouchStart}
            onTouchMove={longPress.onTouchMove}
            onTouchEnd={longPress.onTouchEnd}
            onTouchCancel={longPress.onTouchCancel}
            onClickCapture={longPress.onClickCapture}
            className={`${vc.btnSize} flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-200 ${
              active ? `${vc.roundedActive} text-white` : `${vc.roundedIdle} text-white/70 hover:${vc.roundedActive} hover:text-white`
            }`}
            style={{ background: g.icon ? 'transparent' : (active ? 'var(--accent)' : 'var(--bg-float)') }}
          >
            <GuildIcon g={g} initials={initials} active={active} iconSize={vc.iconSize} fontSize={vc.fontSize} />
          </button>
          {hasMention && (
            <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 border-2 border-[var(--bg-tertiary)]">
              {mentions > 99 ? '99+' : mentions}
            </span>
          )}
        </div>
        </div>
      </Tooltip>
    </div>
  );
}

function StaticBtn({ vc, active, onClick, title, children }) {
  return (
    <Tooltip text={title} placement="right">
      <div className={`relative flex items-center justify-center w-full ${vc.rowH} group`} aria-label={title}>
        <button
          onClick={onClick}
          className={`${vc.btnSize} flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-200 ${
            active ? `${vc.roundedActive} bg-[var(--accent)] text-white` : `${vc.roundedIdle} bg-white/[0.06] text-white/60 hover:${vc.roundedActive} hover:bg-white/[0.12] hover:text-white`
          }`}
        >
          {children}
        </button>
      </div>
    </Tooltip>
  );
}

// Discord-style DM circle: shows in the guild rail ONLY when a DM has
// unread activity. Click navigates to that DM. Unlike guild items, DMs
// stay as circles (rounded-full) and always show the user avatar; no
// initials fallback, no hover-squircle transition. The red dot is the
// mention/unread badge.
function DMItem({ entry, vc, onClick }) {
  const count = entry.count || 0;
  return (
    <Tooltip text={entry.peer_username} placement="right">
    <div
      className={`relative flex items-center justify-center w-full ${vc.rowH} group`}
      aria-label={entry.peer_username}
    >
      <div className={`relative ${vc.btnSize} flex-shrink-0`}>
        <button
          onClick={onClick}
          className={`${vc.btnSize} rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 ring-2 ring-transparent hover:ring-white/20`}
        >
          <AvatarWithStatus online={entry.online} size="sm">
            <UserAvatar username={entry.peer_username} avatarId={entry.peer_avatar} size="lg" />
          </AvatarWithStatus>
        </button>
        {count > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 border-2 border-[var(--bg-tertiary)]">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
    </div>
    </Tooltip>
  );
}

export default function GuildSelector({
  variant = 'desktop',
  activeGuildId,
  isDMActive,
  onSelect,
  onDMs,
  onSelectDM,
  onReorderGuilds,
  guildUnread = {},
  guildMentions = {},
  dmEntries = [],
  user,
}) {
  const t = useT();
  const vc = VARIANTS[variant] || VARIANTS.desktop;
  const { guilds: rawGuilds } = useGuilds();
  const { prefs, setPref } = useUIPrefs();
  const { openMenu } = useContextMenu();
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const guilds = useMemo(() => {
    const saved = prefs.guildOrder;
    if (!Array.isArray(saved) || saved.length === 0) return rawGuilds;
    const byId = new Map(rawGuilds.map(g => [g.id, g]));
    const ordered = [];
    for (const id of saved) {
      const g = byId.get(id);
      if (g) { ordered.push(g); byId.delete(id); }
    }
    for (const g of byId.values()) ordered.push(g);
    return ordered;
  }, [rawGuilds, prefs.guildOrder]);

  const handleDrop = (toIdx) => {
    if (dragIdx == null || dragIdx === toIdx || !guilds) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const arr = [...guilds];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(toIdx, 0, moved);
    onReorderGuilds?.(arr);
    setPref('guildOrder', arr.map(g => g.id));
    setDragIdx(null);
    setOverIdx(null);
  };

  const startDrag = (e, i) => {
    setDragIdx(i);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(i));
    } catch {}
  };

  const overDrag = (e, i) => {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch {}
    setOverIdx(i);
  };

  const fireCreate = () => window.dispatchEvent(new CustomEvent('openCreateGuild'));
  const fireJoin = () => window.dispatchEvent(new CustomEvent('openJoinGuild'));

  return (
    <div className={`${vc.wrapClass} flex-shrink-0 bg-[var(--bg-tertiary)] flex-col items-center pt-3 pb-3 gap-[6px] overflow-y-auto scrollbar-none ${variant === 'desktop' ? 'pb-[56px]' : ''}`}>
      <StaticBtn vc={vc} active={!!isDMActive} onClick={onDMs} title={t('guild_rail.dm_title')}>
        <SiteHomeIcon className={vc.iconSize} />
      </StaticBtn>

      {dmEntries.map(entry => (
        <DMItem
          key={entry.peer_id}
          entry={entry}
          vc={vc}
          onClick={() => onSelectDM?.(entry.peer_id)}
        />
      ))}

      <div className="w-8 h-[2px] bg-white/10 rounded-full my-[4px]" />

      {(guilds || []).map((g, i) => (
        <GuildItem
          key={g.id}
          g={g}
          active={g.id === activeGuildId}
          unread={guildUnread[g.id] || 0}
          mentions={guildMentions[g.id] || 0}
          vc={vc}
          onClick={() => onSelect?.(g.id)}
          openMenu={openMenu}
          user={user}
          draggable={vc.reorder}
          dragHandlers={vc.reorder ? {
            onDragStart: (e) => startDrag(e, i),
            onDragOver: (e) => overDrag(e, i),
            onDrop: (e) => { e.preventDefault(); handleDrop(i); },
            onDragEnd: () => { setDragIdx(null); setOverIdx(null); },
          } : null}
          showInsertBar={vc.reorder && overIdx === i && dragIdx !== null && dragIdx !== i}
        />
      ))}

      <div className="w-8 h-[2px] bg-white/10 rounded-full my-[4px]" />

      <StaticBtn vc={vc} onClick={fireCreate} title={t('guilds.selector_create_title')}>
        <PlusIcon className={`${vc.iconSize} text-emerald-400 group-hover:text-white transition-colors`} />
      </StaticBtn>

      <StaticBtn vc={vc} onClick={fireJoin} title={t('guilds.selector_join_title')}>
        <svg className={`${vc.iconSize} text-emerald-400 group-hover:text-white transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      </StaticBtn>

      {DISCOVERY_URL && (
        <StaticBtn vc={vc} onClick={() => window.open(DISCOVERY_URL, '_blank', 'noopener')} title={t('guilds.selector_discover_title')}>
          <svg className={`${vc.iconSize} text-emerald-400 group-hover:text-white transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </StaticBtn>
      )}
    </div>
  );
}