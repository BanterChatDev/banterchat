import React, { useEffect, useRef, useMemo } from 'react';
import { CloseIcon, SearchIcon } from '../icons';
import Spinner from '../ui/Spinner';
import { useContextMenu } from '../contextmenu';
import { useMemberList } from '../../hooks/useMemberList';
import { useTypingUsers } from '../../hooks/useTypingUsers';
import { useT } from '../../hooks/useT';
import { resolveStatus } from '../status';
import MemberGroupList, { groupByRole } from './MemberGroupList';

export default function MembersSidebar({ channelId, guildId, guildMe, onUserClick, mobileOpen, onCloseMobile, width }) {
  const t = useT();
  const { openMenu } = useContextMenu();
  const listRef = useRef(null);
  const typers = useTypingUsers(channelId);
  const { items: members, loading, loadingMore, hasMore, total: memberTotal, onlineCount, search, handleSearch, clearSearch, loadInitial, loadMore } = useMemberList({
    cacheKey: channelId ? `members:${channelId}` : 'members',
    channelId,
    guildId,
    syncOnline: true,
  });
  const openUserMenu = (e, ctx) => openMenu(e, { ...ctx, guildMe });

  useEffect(() => { loadInitial(); }, [channelId]);

  const { onlineGroups, offline } = useMemo(() => {
    const visible = members.filter(m => !m.banned);
    const on = [];
    const off = [];
    for (const m of visible) {
      if (resolveStatus(m.presence_status, m.online) === 'offline') off.push(m);
      else on.push(m);
    }
    return { onlineGroups: groupByRole(on), offline: off };
  }, [members]);

  const offlineTotal = (memberTotal != null && onlineCount != null)
    ? Math.max(0, memberTotal - onlineCount)
    : null;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onCloseMobile} />
      )}
      <div className={`
        fixed inset-y-0 right-0 z-40 w-64 border-l border-white/[0.06] bg-[var(--bg-secondary)] flex flex-col transform transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:relative lg:translate-x-0 lg:max-h-full lg:overflow-hidden lg:![width:var(--panel-w)]
        ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}
        ${!mobileOpen ? 'hidden lg:flex' : 'flex'}
      `} style={{ '--panel-w': (width || 208) + 'px' }}>
        <div className="px-3 py-2.5 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{memberTotal != null ? t('channels.members_sidebar.header_template').replace('{n}', memberTotal) : t('channels.members_sidebar.header_no_count')}</span>
            <button onClick={onCloseMobile} className="lg:hidden text-white/30 hover:text-white/60 transition-colors">
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={t('friends.online_tab.search_placeholder')}
              className="w-full bg-[var(--bg-tertiary)] border border-white/[0.06] rounded-md pl-7 pr-7 py-1 text-[11px] text-white/70 placeholder-white/20 focus:outline-none focus:border-white/15 transition-colors"
            />
            {search && (
              <button onClick={clearSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div ref={listRef} onScroll={() => { const el = listRef.current; if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMore && !loadingMore) loadMore(); }} className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-[11px] text-white/20 text-center py-4">{t('settings_members.empty')}</p>
          ) : (
            <MemberGroupList
              onlineGroups={onlineGroups}
              offline={offline}
              offlineTotal={offlineTotal}
              hasMore={hasMore}
              onUserClick={onUserClick}
              onContextMenu={openUserMenu}
              loadingMore={loadingMore}
              typers={typers}
            />
          )}
        </div>
      </div>
    </>
  );
}