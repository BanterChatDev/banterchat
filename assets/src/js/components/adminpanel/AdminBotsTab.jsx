import React, { useCallback, useRef, useState } from 'react';
import { apiAdminListBots } from '../../api/admin';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { usePermEvents } from '../../hooks/usePermEvents';
import InfiniteList from '../ui/InfiniteList';
import UserAvatar from '../user/UserAvatar';
import UserProfileModal from '../user/UserProfileModal';
import AdminBotCard from './AdminBotCard';
import DropdownMenu, { DropdownItem } from '../ui/DropdownMenu';
import { CloseIcon, ChevronIcon } from '../icons';
import { useT } from '../../hooks/useT';

const FILTERS = ['all', 'online', 'offline', 'banned', 'verified', 'unverified'];
const SORTS = ['name_asc', 'name_desc', 'created_desc', 'created_asc', 'guilds_desc'];

function FilterChip({ value, current, onClick, label }) {
  const active = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={`text-[12px] font-semibold px-3 py-1.5 rounded transition-colors border ${
        active
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40'
          : 'bg-[var(--bg-input)] text-white/55 border-[var(--border-medium)] hover:text-white/85 hover:border-[var(--border-strong,var(--border-medium))]'
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminBotsTab({ currentUserId }) {
  const t = useT();
  const [openAppId, setOpenAppId] = useState(null);
  const [openOwnerId, setOpenOwnerId] = useState(null);
  const [openOwnerAnchor, setOpenOwnerAnchor] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created_desc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortBtnRef = useRef(null);

  const fetchPage = useCallback(({ offset, limit, search }) => {
    return apiAdminListBots({ offset, limit, search, sort, filter }).then(r => ({
      items: r.bots || [],
      total: r.total,
    }));
  }, [sort, filter]);

  const {
    items: bots, setItems: setBots, total, hasMore, loading, loadingMore,
    loadInitial, loadMore, reset, search, handleSearch, clearSearch,
  } = usePaginatedSearch({ fetchPage });

  React.useEffect(() => { reset(); loadInitial(); }, [filter, sort]);

  usePermEvents({
    userTerminate: ({ user_id }) => setBots(list => list.map(b => b.bot_user_id === user_id ? { ...b, banned: true } : b)),
    userRestore: ({ user_id }) => setBots(list => list.map(b => b.bot_user_id === user_id ? { ...b, banned: false } : b)),
    adminUserPresence: ({ user_id, online }) => setBots(list => list.map(b => b.bot_user_id === user_id ? { ...b, online } : b)),
  });

  const header = (
    <div className="grid grid-cols-[auto_1fr_110px] sm:grid-cols-[auto_1fr_140px_100px_110px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40 sticky top-0">
      <div className="w-8" />
      <div>{t('adminpanel.bots_col_bot')}</div>
      <div className="hidden sm:block">{t('adminpanel.bots_col_owner')}</div>
      <div className="hidden sm:block text-right">{t('adminpanel.bots_col_guilds')}</div>
      <div className="hidden sm:block">{t('adminpanel.bots_col_created')}</div>
    </div>
  );

  const renderItem = (b) => {
    const baseGrid = 'grid grid-cols-[auto_1fr_110px] sm:grid-cols-[auto_1fr_140px_100px_110px] gap-3 px-4 py-2.5 items-center cursor-pointer';
    const rowClass = b.banned
      ? `${baseGrid} border-b border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.07]`
      : `${baseGrid} border-b border-white/[0.04] hover:bg-white/[0.04]`;
    return (
      <div onClick={() => setOpenAppId(b.id)} className={rowClass}>
        <div className="relative">
          <UserAvatar username={b.name} avatarId={b.avatar_id} userId={b.bot_user_id} size="sm" />
          {!b.banned && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-base)] ${b.online ? 'bg-emerald-400' : 'bg-white/20'}`} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[13px] font-medium truncate ${b.banned ? 'text-red-400/80 line-through' : 'text-white/85'}`}>{b.name}</span>
            {b.banned && <span className="text-[9px] font-bold px-1.5 py-px rounded bg-red-500/20 text-red-400 uppercase tracking-wider">{t('settings_members.badge_banned')}</span>}
            {b.verified && <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[var(--accent)]/20 text-[var(--accent)] uppercase tracking-wider">{t('adminpanel.bots_badge_verified')}</span>}
          </div>
          <div className="text-[11px] text-white/30 font-mono truncate">{b.id}</div>
          <div className="sm:hidden text-[11px] text-white/45 mt-0.5">
            <span className="text-white/55">@{b.owner_username || b.owner_id.slice(0, 8)}</span>
            <span className="text-white/25"> · {t('adminpanel.bots_mobile_guilds_template').replace('{n}', b.guild_count || 0)}</span>
            {b.created_at && <span className="text-white/25"> · {b.created_at}</span>}
          </div>
        </div>
        <div className="hidden sm:block text-[12px] text-white/60 truncate">@{b.owner_username || b.owner_id.slice(0, 12)}</div>
        <div className="hidden sm:block text-right text-[12px] text-white/60 tabular-nums">{b.guild_count || 0}</div>
        <div className="hidden sm:block text-[12px] text-white/50 tabular-nums">{b.created_at}</div>
      </div>
    );
  };

  const openOwner = (ownerId) => {
    setOpenAppId(null);
    setOpenOwnerAnchor(null);
    setOpenOwnerId(ownerId);
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold text-white/90">{t('adminpanel.bots_heading')}</h2>
        <span className="text-[12px] text-white/30 tabular-nums">{t('adminpanel.users_total_template').replace('{n}', total ?? bots.length)}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={t('adminpanel.bots_search_placeholder')}
            className="w-full bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-2 pr-8 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/[0.15]"
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <button
            ref={sortBtnRef}
            onClick={() => setSortOpen(o => !o)}
            aria-label={t('adminpanel.users_sort_label')}
            className={`flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-md px-3 py-2 text-[12px] text-white/85 hover:border-[var(--border-strong,var(--border-medium))] ${sortOpen ? 'border-[var(--accent)]/40' : ''}`}
          >
            <span>{t('adminpanel.bots_sort_' + sort)}</span>
            <ChevronIcon className={`w-3 h-3 text-white/40 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <DropdownMenu anchorRef={sortBtnRef} onClose={() => setSortOpen(false)} width={180} align="right" className="py-1">
              {SORTS.map(s => (
                <DropdownItem
                  key={s}
                  label={t('adminpanel.bots_sort_' + s)}
                  active={s === sort}
                  onClick={() => { setSort(s); setSortOpen(false); }}
                />
              ))}
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <FilterChip
            key={f}
            value={f}
            current={filter}
            onClick={setFilter}
            label={t('adminpanel.bots_filter_' + f)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <InfiniteList
          items={bots}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadInitial={loadInitial}
          onLoadMore={loadMore}
          renderItem={renderItem}
          header={header}
          emptyText={t('adminpanel.bots_empty')}
        />
      </div>

      <AdminBotCard
        appId={openAppId}
        onClose={() => setOpenAppId(null)}
        onOpenOwner={openOwner}
      />

      {openOwnerId && (
        <UserProfileModal
          userId={openOwnerId}
          currentUserId={currentUserId}
          anchorPos={openOwnerAnchor}
          onClose={() => { setOpenOwnerId(null); setOpenOwnerAnchor(null); }}
        />
      )}
    </div>
  );
}