import React, { useCallback, useState } from 'react';
import { apiListTerminations, apiRestoreUser } from '../../api/users';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { usePermEvents } from '../../hooks/usePermEvents';
import InfiniteList from '../ui/InfiniteList';
import UserAvatar from '../user/UserAvatar';
import { CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { t as tBare } from '../../lang/apply';

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return tBare('common.time_seconds_ago_template').replace('{n}', s);
  if (s < 3600) return tBare('common.time_minutes_ago_template').replace('{n}', Math.floor(s / 60));
  if (s < 86400) return tBare('common.time_hours_ago_template').replace('{n}', Math.floor(s / 3600));
  if (s < 2592000) return tBare('common.time_days_ago_template').replace('{n}', Math.floor(s / 86400));
  return new Date(iso).toLocaleDateString();
}

export default function AdminTerminationsTab() {
  const t = useT();
  const [busyId, setBusyId] = useState(null);

  const fetchPage = useCallback(({ offset, limit, search }) => {
    return apiListTerminations({ offset, limit, search }).then(r => ({
      items: r.terminations || [],
      total: r.total,
    }));
  }, []);

  const {
    items: terminations, setItems: setTerminations, total, hasMore, loading, loadingMore,
    loadInitial, loadMore, reset, search, handleSearch, clearSearch,
  } = usePaginatedSearch({ fetchPage });

  usePermEvents({
    userTerminate: () => { reset(); loadInitial(); },
    userRestore: ({ user_id }) => {
      setTerminations(list => list.filter(b => b.user_id !== user_id));
    },
  });

  const restore = async (b) => {
    setBusyId(b.user_id);
    try { await apiRestoreUser(b.user_id); } catch {}
    setBusyId(null);
  };

  const header = (
    <div className="grid grid-cols-[auto_1fr_110px] sm:grid-cols-[auto_1fr_140px_110px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40 sticky top-0">
      <div className="w-8" />
      <div>{t('adminpanel.terminations_col_user_reason')}</div>
      <div className="hidden sm:block">{t('adminpanel.terminations_col_terminated')}</div>
      <div className="text-right">{t('adminpanel.terminations_col_action')}</div>
    </div>
  );

  const renderItem = (b) => (
    <div className="grid grid-cols-[auto_1fr_110px] sm:grid-cols-[auto_1fr_140px_110px] gap-3 px-4 py-3 items-center border-b border-red-500/15 bg-red-500/[0.03] hover:bg-red-500/[0.06]">
      <UserAvatar username={b.username} avatarId={b.avatar_id} userId={b.user_id} size="sm" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-white/85 truncate">{b.username || t('adminpanel.terminations_unknown_user')}</span>
          <span className="text-[9px] font-bold px-1.5 py-px rounded bg-red-500/20 text-red-400 uppercase tracking-wider">{t('settings_members.badge_banned')}</span>
          <span className="text-[10px] text-white/25 font-mono truncate">{b.user_id}</span>
        </div>
        <div className="text-[12px] text-white/50 leading-snug mt-0.5 break-words">
          {b.reason
            ? <><span className="text-white/30">{t('adminpanel.terminations_reason_label')}</span> {b.reason}</>
            : <span className="text-white/25 italic">{t('adminpanel.terminations_no_reason_given')}</span>}
        </div>
        <div className="sm:hidden text-[11px] text-white/40 tabular-nums mt-1">
          {b.created_at ? timeAgo(b.created_at) : '—'}
          {b.terminated_by_username && <span className="text-white/25"> · {t('adminpanel.terminations_by_username_template').replace('{username}', b.terminated_by_username)}</span>}
        </div>
      </div>
      <div className="hidden sm:block text-[11px] text-white/40 tabular-nums">
        <div>{b.created_at ? timeAgo(b.created_at) : '—'}</div>
        {b.terminated_by_username && (
          <div className="text-white/25 truncate">{t('adminpanel.terminations_by_username_template').replace('{username}', b.terminated_by_username)}</div>
        )}
      </div>
      <div className="text-right">
        <button
          disabled={busyId === b.user_id}
          onClick={() => restore(b)}
          className="text-[11px] font-semibold px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70 disabled:opacity-40 transition-colors"
        >
          {busyId === b.user_id ? '…' : t('adminpanel.users_btn_restore')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold text-white/90">{t('adminpanel.terminations_heading')}</h2>
        <span className="text-[12px] text-white/30 tabular-nums">{t('adminpanel.users_total_template').replace('{n}', total ?? terminations.length)}</span>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder={t('adminpanel.terminations_search_placeholder')}
          className="w-full bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-2 pr-8 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/[0.15]"
        />
        {search && (
          <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <InfiniteList
          items={terminations}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadInitial={loadInitial}
          onLoadMore={loadMore}
          renderItem={renderItem}
          header={header}
          emptyText={t('adminpanel.terminations_empty')}
        />
      </div>
    </div>
  );
}