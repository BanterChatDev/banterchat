import React, { useCallback, useState } from 'react';
import { apiAdminListListings, apiAdminUnlistListing } from '../../api/admin';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import InfiniteList from '../ui/InfiniteList';
import { CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function AdminListingsTab() {
  const t = useT();
  const [confirmId, setConfirmId] = useState(null);
  const [unlisting, setUnlisting] = useState(false);

  const fetchPage = useCallback(({ offset, limit, search }) => {
    return apiAdminListListings({ offset, limit, search }).then(r => ({
      items: r.listings || [],
      total: r.total,
    }));
  }, []);

  const {
    items: listings, setItems: setListings, total, hasMore, loading, loadingMore,
    loadInitial, loadMore, search, handleSearch, clearSearch,
  } = usePaginatedSearch({ fetchPage });

  const unlist = async (guildId) => {
    setUnlisting(true);
    try {
      await apiAdminUnlistListing(guildId);
      setListings(list => list.filter(l => l.guild_id !== guildId));
      setConfirmId(null);
    } catch {} finally { setUnlisting(false); }
  };

  const header = (
    <div className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_120px_90px_90px_100px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40 sticky top-0">
      <div>{t('adminpanel.listings_col_server')}</div>
      <div className="hidden sm:block">{t('adminpanel.listings_col_slug')}</div>
      <div className="hidden sm:block text-right">{t('adminpanel.listings_col_bumps')}</div>
      <div className="hidden sm:block text-right">{t('adminpanel.listings_col_rating')}</div>
      <div className="text-right">{t('adminpanel.listings_col_actions')}</div>
    </div>
  );

  const renderItem = (l) => (
    <div key={l.guild_id} className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_120px_90px_90px_100px] gap-3 px-4 py-2.5 items-center border-b border-white/[0.04] hover:bg-white/[0.04]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-white/85 truncate">{l.guild_name}</span>
          {l.nsfw && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold tracking-wider">18+</span>}
          {!l.published && <span className="text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-bold tracking-wider">{t('adminpanel.listings_badge_hidden')}</span>}
        </div>
        <div className="text-[11px] text-white/40 truncate">{l.bio}</div>
        <div className="sm:hidden text-[11px] text-white/45 tabular-nums mt-1 flex flex-wrap gap-x-2">
          <span className="font-mono text-white/50 truncate">{l.slug}</span>
          <span className="text-white/25">·</span>
          <span>{t('adminpanel.listings_mobile_bumps_template').replace('{n}', l.bump_count)}</span>
          {l.rating_count > 0 && (
            <>
              <span className="text-white/25">·</span>
              <span>{t('adminpanel.listings_rating_template').replace('{avg}', l.rating_avg.toFixed(1)).replace('{count}', l.rating_count)}</span>
            </>
          )}
        </div>
      </div>
      <div className="hidden sm:block text-[12px] font-mono text-white/50 truncate">{l.slug}</div>
      <div className="hidden sm:block text-right text-[13px] tabular-nums text-white/70">{l.bump_count}</div>
      <div className="hidden sm:block text-right text-[13px] tabular-nums text-white/70">
        {l.rating_count > 0 ? t('adminpanel.listings_rating_template').replace('{avg}', l.rating_avg.toFixed(1)).replace('{count}', l.rating_count) : '—'}
      </div>
      <div className="text-right">
        {confirmId === l.guild_id ? (
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => setConfirmId(null)}
              disabled={unlisting}
              className="px-2 py-1 rounded text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-white/70"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => unlist(l.guild_id)}
              disabled={unlisting}
              className="px-2 py-1 rounded text-[11px] bg-red-500 hover:bg-red-600 text-white disabled:opacity-40"
            >
              {unlisting ? '...' : t('adminpanel.listings_btn_confirm_unlist')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmId(l.guild_id)}
            className="px-2 py-1 rounded text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
          >
            {t('discovery.btn_unlist')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold text-white/90">{t('adminpanel.listings_heading')}</h2>
        <span className="text-[12px] text-white/30 tabular-nums">{t('adminpanel.users_total_template').replace('{n}', total ?? listings.length)}</span>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder={t('adminpanel.listings_search_placeholder')}
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
          items={listings}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadInitial={loadInitial}
          onLoadMore={loadMore}
          renderItem={renderItem}
          header={header}
          emptyText={t('adminpanel.listings_empty')}
        />
      </div>
    </div>
  );
}