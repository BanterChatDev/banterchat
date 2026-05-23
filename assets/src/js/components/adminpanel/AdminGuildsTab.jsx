import React, { useCallback, useRef, useState } from 'react';
import { apiAdminListGuilds } from '../../api/admin';
import { u } from '../../api/routes';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { usePermEvents } from '../../hooks/usePermEvents';
import InfiniteList from '../ui/InfiniteList';
import AdminGuildCard from './AdminGuildCard';
import DropdownMenu, { DropdownItem } from '../ui/DropdownMenu';
import { CloseIcon, ChevronIcon } from '../icons';
import { useT } from '../../hooks/useT';

const FILTERS = ['all', 'active', 'empty'];
const SORTS = ['name_asc', 'name_desc', 'created_desc', 'created_asc', 'members_desc', 'messages_desc'];

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

export default function AdminGuildsTab({ navigate }) {
  const t = useT();
  const [openGuildId, setOpenGuildId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created_desc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortBtnRef = useRef(null);

  const fetchPage = useCallback(({ offset, limit, search }) => {
    return apiAdminListGuilds({ offset, limit, search, sort, filter }).then(r => ({
      items: r.guilds || [],
      total: r.total,
    }));
  }, [sort, filter]);

  const {
    items: guilds, setItems: setGuilds, total, hasMore, loading, loadingMore,
    loadInitial, loadMore, reset, search, handleSearch, clearSearch,
  } = usePaginatedSearch({ fetchPage });

  React.useEffect(() => { reset(); loadInitial(); }, [filter, sort]);

  usePermEvents({
    adminGuildTerminate: ({ guild_id }) => {
      setGuilds(list => list.filter(g => g.id !== guild_id));
    },
    guildPresence: ({ guild_id, online_count }) => {
      if (online_count == null) return;
      setGuilds(list => list.map(g => g.id === guild_id ? { ...g, online_count } : g));
    },
  });

  const header = (
    <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_130px_110px_110px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40 sticky top-0">
      <div className="w-9" />
      <div>{t('adminpanel.guilds_col_name')}</div>
      <div className="hidden sm:block text-right">{t('adminpanel.guilds_col_members')}</div>
      <div className="hidden sm:block text-right">{t('adminpanel.guilds_col_messages')}</div>
      <div className="hidden sm:block">{t('adminpanel.guilds_col_created')}</div>
    </div>
  );

  const renderItem = (g) => (
    <div onClick={() => setOpenGuildId(g.id)} className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_130px_110px_110px] gap-3 px-4 py-2.5 items-center border-b border-white/[0.04] hover:bg-white/[0.04] cursor-pointer">
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-[var(--accent)] text-white text-[13px] font-bold">
        {g.icon ? <img src={u.guildAvatar(g.icon)} alt="" className="w-full h-full object-cover" /> : g.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-white/85 truncate">{g.name}</div>
        <div className="text-[11px] text-white/30 font-mono truncate">{g.id}</div>
        <div className="sm:hidden text-[11px] text-white/45 tabular-nums mt-1">
          <span className="text-emerald-400/80">{g.online_count || 0}</span>
          <span className="text-white/25 mx-1">/</span>
          <span className="text-white/55">{g.member_count || 0}</span>
          <span className="text-white/25"> · {t('adminpanel.guilds_mobile_msgs_template').replace('{n}', (g.message_count || 0).toLocaleString())}</span>
          {g.created_at && <span className="text-white/25"> · {g.created_at}</span>}
        </div>
      </div>
      <div className="hidden sm:block text-right text-[12px] tabular-nums">
        <span className="text-emerald-400/90">{g.online_count || 0}</span>
        <span className="text-white/25 mx-1">/</span>
        <span className="text-white/60">{g.member_count || 0}</span>
      </div>
      <div className="hidden sm:block text-right text-[13px] tabular-nums text-white/60">{(g.message_count || 0).toLocaleString()}</div>
      <div className="hidden sm:block text-[12px] text-white/50 tabular-nums">{g.created_at}</div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold text-white/90">{t('adminpanel.guilds_heading')}</h2>
        <span className="text-[12px] text-white/30 tabular-nums">{t('adminpanel.users_total_template').replace('{n}', total ?? guilds.length)}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={t('adminpanel.guilds_search_placeholder')}
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
            <span>{t('adminpanel.guilds_sort_' + sort)}</span>
            <ChevronIcon className={`w-3 h-3 text-white/40 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <DropdownMenu anchorRef={sortBtnRef} onClose={() => setSortOpen(false)} width={180} align="right" className="py-1">
              {SORTS.map(s => (
                <DropdownItem
                  key={s}
                  label={t('adminpanel.guilds_sort_' + s)}
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
            label={t('adminpanel.guilds_filter_' + f)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <InfiniteList
          items={guilds}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadInitial={loadInitial}
          onLoadMore={loadMore}
          renderItem={renderItem}
          header={header}
          emptyText={t('adminpanel.guilds_empty')}
        />
      </div>
      <AdminGuildCard guildId={openGuildId} onClose={() => setOpenGuildId(null)} navigate={navigate} />
    </div>
  );
}