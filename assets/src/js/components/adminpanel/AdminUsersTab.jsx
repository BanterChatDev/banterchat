import React, { useCallback, useRef, useState } from 'react';
import { apiAdminListUsers } from '../../api/admin';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { usePermEvents } from '../../hooks/usePermEvents';
import InfiniteList from '../ui/InfiniteList';
import UserAvatar from '../user/UserAvatar';
import UserProfileModal from '../user/UserProfileModal';
import AdminUserActionsMenu from './AdminUserActionsMenu';
import SuspendUserModal from './SuspendUserModal';
import DeleteUserModal from './DeleteUserModal';
import DropdownMenu, { DropdownItem } from '../ui/DropdownMenu';
import { CloseIcon, ChevronIcon } from '../icons';
import { useT } from '../../hooks/useT';

const FILTERS = ['all', 'online', 'offline', 'banned'];
const SORTS = ['name_asc', 'name_desc', 'created_desc', 'created_asc'];

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

export default function AdminUsersTab({ currentUserId }) {
  const t = useT();
  const [openUserId, setOpenUserId] = useState(null);
  const [openAnchor, setOpenAnchor] = useState(null);
  const [suspendUser, setSuspendUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created_desc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortBtnRef = useRef(null);

  const fetchPage = useCallback(({ offset, limit, search }) => {
    return apiAdminListUsers({ offset, limit, search, filter, sort }).then(r => ({
      items: r.users || [],
      total: r.total,
    }));
  }, [filter, sort]);

  const {
    items: users, setItems: setUsers, total, hasMore, loading, loadingMore,
    loadInitial, loadMore, reset, search, handleSearch, clearSearch,
  } = usePaginatedSearch({ fetchPage });

  React.useEffect(() => { reset(); loadInitial(); }, [filter, sort]);

  usePermEvents({
    userTerminate: ({ user_id }) => setUsers(list => list.map(u => u.id === user_id ? { ...u, banned: true } : u)),
    userRestore: ({ user_id }) => setUsers(list => list.map(u => u.id === user_id ? { ...u, banned: false } : u)),
    adminUserPresence: ({ user_id, online }) => setUsers(list => list.map(u => u.id === user_id ? { ...u, online } : u)),
    adminUserSuspend: ({ user_id }) => setUsers(list => list.map(u => u.id === user_id ? { ...u, suspended: true } : u)),
    adminUserUnsuspend: ({ user_id }) => setUsers(list => list.map(u => u.id === user_id ? { ...u, suspended: false } : u)),
    adminUserDelete: ({ user_id }) => setUsers(list => list.filter(u => u.id !== user_id)),
    adminUserPromote: ({ user_id }) => setUsers(list => list.map(u => u.id === user_id ? { ...u, is_site_admin: true } : u)),
    adminUserDemote: ({ user_id }) => setUsers(list => list.map(u => u.id === user_id ? { ...u, is_site_admin: false } : u)),
  });

  const openCard = (e, u) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenAnchor({ x: rect.left + 20, y: rect.top });
    setOpenUserId(u.id);
  };

  const header = (
    <div className="grid grid-cols-[auto_1fr_110px] sm:grid-cols-[auto_1fr_120px_90px_110px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40 sticky top-0">
      <div className="w-8" />
      <div>{t('adminpanel.users_col_user')}</div>
      <div className="hidden sm:block">{t('adminpanel.users_col_joined')}</div>
      <div className="hidden sm:block">{t('adminpanel.users_col_status')}</div>
      <div className="text-right">{t('adminpanel.users_col_action')}</div>
    </div>
  );

  const renderItem = (u) => {
    const baseGrid = 'grid grid-cols-[auto_1fr_110px] sm:grid-cols-[auto_1fr_120px_90px_110px] gap-3 px-4 py-2.5 items-center cursor-pointer';
    const rowClass = u.banned
      ? `${baseGrid} border-b border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.07]`
      : `${baseGrid} border-b border-white/[0.04] hover:bg-white/[0.04]`;
    return (
      <div onClick={(e) => openCard(e, u)} className={rowClass}>
        <div className="relative">
          <UserAvatar username={u.username} avatarId={u.avatar_id} userId={u.id} size="sm" />
          {!u.banned && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-base)] ${u.online ? 'bg-emerald-400' : 'bg-white/20'}`} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[13px] font-medium truncate ${u.banned ? 'text-red-400/80 line-through' : 'text-white/85'}`}>{u.username}</span>
            {u.banned && <span className="text-[9px] font-bold px-1.5 py-px rounded bg-red-500/20 text-red-400 uppercase tracking-wider">{t('settings_members.badge_banned')}</span>}
            {u.is_site_admin && <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[var(--accent)]/20 text-[var(--accent)] uppercase tracking-wider">{t('adminpanel.users_badge_admin')}</span>}
            {u.is_bot && <span className="text-[9px] font-bold px-1.5 py-px rounded bg-white/[0.08] text-white/50 uppercase tracking-wider">{t('embed_invite.bot_subtitle')}</span>}
          </div>
          <div className="text-[11px] text-white/30 font-mono truncate">{u.id}</div>
          <div className="sm:hidden text-[11px] text-white/40 tabular-nums mt-0.5">
            {u.banned
              ? <span className="text-red-400/80">{t('settings_members.badge_banned')}</span>
              : u.online
                ? <span className="text-emerald-400/80">● {t('friends.online_tab.subtext_online')}</span>
                : <span>{t('friends.online_tab.subtext_offline')}</span>}
            {u.created_at && <span className="text-white/25"> · {u.created_at}</span>}
          </div>
        </div>
        <div className="hidden sm:block text-[12px] text-white/50 tabular-nums">{u.created_at}</div>
        <div className="hidden sm:block">
          {u.banned
            ? <span className="text-[11px] font-semibold text-red-400">{t('settings_members.badge_banned')}</span>
            : u.online
              ? <span className="text-[11px] font-semibold text-emerald-400/90 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{t('friends.online_tab.subtext_online')}</span>
              : <span className="text-[11px] font-semibold text-white/40">{t('friends.online_tab.subtext_offline')}</span>}
        </div>
        <div className="text-right">
          <AdminUserActionsMenu
            user={u}
            currentUserId={currentUserId}
            onAction={() => {}}
            onSuspendClick={(usr) => setSuspendUser(usr)}
            onDeleteClick={(usr) => setDeleteUser(usr)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold text-white/90">{t('adminpanel.users_heading')}</h2>
        <span className="text-[12px] text-white/30 tabular-nums">{t('adminpanel.users_total_template').replace('{n}', total ?? users.length)}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={t('adminpanel.users_search_placeholder')}
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
            <span>{t('adminpanel.users_sort_' + sort)}</span>
            <ChevronIcon className={`w-3 h-3 text-white/40 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <DropdownMenu anchorRef={sortBtnRef} onClose={() => setSortOpen(false)} width={180} align="right" className="py-1">
              {SORTS.map(s => (
                <DropdownItem
                  key={s}
                  label={t('adminpanel.users_sort_' + s)}
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
            label={t('adminpanel.users_filter_' + f)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <InfiniteList
          items={users}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadInitial={loadInitial}
          onLoadMore={loadMore}
          renderItem={renderItem}
          header={header}
          emptyText={t('adminpanel.users_empty')}
        />
      </div>

      {openUserId && (
        <UserProfileModal
          userId={openUserId}
          currentUserId={currentUserId}
          anchorPos={openAnchor}
          onClose={() => { setOpenUserId(null); setOpenAnchor(null); }}
        />
      )}

      <SuspendUserModal
        isOpen={!!suspendUser}
        user={suspendUser}
        onClose={() => setSuspendUser(null)}
        onSuspended={() => { reset(); loadInitial(); }}
      />

      <DeleteUserModal
        isOpen={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={() => { reset(); loadInitial(); }}
      />
    </div>
  );
}