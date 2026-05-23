import React, { useCallback, useEffect, useState } from 'react';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import InfiniteList from '../ui/InfiniteList';
import { DownloadIcon } from '../icons';
import { useT } from '../../hooks/useT';
import AuditLogEntry from './AuditLogEntry';
import { actionLabel } from './actionTemplates';
import SearchableSelect from '../ui/SearchableSelect';

export default function AuditLogList({
  fetchPage,
  actionFilters = [],
  showActorFilter = false,
  showTargetFilter = false,
  exportUrl,
  title,
}) {
  const t = useT();
  const [actionFilter, setActionFilter] = useState('');
  const [actorIdFilter, setActorIdFilter] = useState('');
  const [targetIdFilter, setTargetIdFilter] = useState('');

  const fetchPageWithFilters = useCallback(({ offset, limit }) => {
    return fetchPage({
      offset,
      limit,
      action: actionFilter,
      actorId: actorIdFilter.trim(),
      targetId: targetIdFilter.trim(),
    }).then(r => ({ items: r.entries || [], total: r.total }));
  }, [fetchPage, actionFilter, actorIdFilter, targetIdFilter]);

  const {
    items: entries,
    total,
    hasMore,
    loading,
    loadingMore,
    loadInitial,
    loadMore,
    reset,
  } = usePaginatedSearch({ fetchPage: fetchPageWithFilters });

  useEffect(() => { reset(); loadInitial(); }, [actionFilter, actorIdFilter, targetIdFilter]);

  const renderItem = (e) => <AuditLogEntry entry={e} />;
  const hasFilters = showActorFilter || showTargetFilter || actionFilters.length > 0;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <h2 className="text-[20px] font-semibold text-white/90">{title || t('auditlog.heading')}</h2>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-white/35 tabular-nums">
              {t('auditlog.entries_count_template').replace('{n}', total ?? entries.length)}
            </span>
            {exportUrl && (
              <a
                href={exportUrl}
                download="audit-log.json"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/70"
              >
                <DownloadIcon className="w-3.5 h-3.5" /> {t('auditlog.export_btn')}
              </a>
            )}
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-2.5 mb-4">
            {actionFilters.length > 0 && (
              <div className="min-w-[200px] flex-1 sm:flex-initial sm:basis-[240px]">
                <SearchableSelect
                  value={actionFilter}
                  onChange={(v) => setActionFilter(v)}
                  options={actionFilters.map(a => ({ value: a, label: a === '' ? t('auditlog.filter_all_actions') : actionLabel(a) }))}
                  searchable={false}
                />
              </div>
            )}
            {showActorFilter && (
              <input
                type="text"
                value={actorIdFilter}
                onChange={(e) => setActorIdFilter(e.target.value)}
                placeholder={t('auditlog.filter_actor_placeholder')}
                className="min-w-[200px] flex-1 sm:flex-initial sm:basis-[240px] bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-2 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-white/[0.15]"
              />
            )}
            {showTargetFilter && (
              <input
                type="text"
                value={targetIdFilter}
                onChange={(e) => setTargetIdFilter(e.target.value)}
                placeholder={t('auditlog.filter_target_placeholder')}
                className="min-w-[200px] flex-1 sm:flex-initial sm:basis-[240px] bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-2 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-white/[0.15]"
              />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <InfiniteList
            items={entries}
            hasMore={hasMore}
            loading={loading}
            loadingMore={loadingMore}
            onLoadInitial={loadInitial}
            onLoadMore={loadMore}
            renderItem={renderItem}
            emptyText={t('auditlog.empty')}
          />
        </div>
      </div>
    </div>
  );
}