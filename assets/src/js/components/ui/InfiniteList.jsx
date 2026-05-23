import React, { useEffect, useRef } from 'react';
import { useT } from '../../hooks/useT';

export default function InfiniteList({
  items,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
  onLoadInitial,
  renderItem,
  getKey = (it) => it.id,
  emptyText,
  loadingText,
  header,
  className = '',
  rootMargin = '200px',
}) {
  const t = useT();
  const emptyTextResolved = emptyText ?? t('ui.infinite_list_empty');
  const loadingTextResolved = loadingText ?? t('ui.infinite_list_loading');
  const sentinelRef = useRef(null);
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (initialLoadedRef.current || !onLoadInitial) return;
    initialLoadedRef.current = true;
    onLoadInitial();
  }, [onLoadInitial]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        onLoadMore?.();
      }
    }, { rootMargin });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore, rootMargin]);

  return (
    <div className={className}>
      {header}
      {loading && items.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-white/30">{loadingTextResolved}</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-white/30">{emptyTextResolved}</p>
      ) : (
        items.map(it => <React.Fragment key={getKey(it)}>{renderItem(it)}</React.Fragment>)
      )}
      <div ref={sentinelRef} className="h-px" />
      {loadingMore && (
        <p className="px-4 py-3 text-center text-[11px] text-white/30">{t('ui.infinite_list_loading_more')}</p>
      )}
    </div>
  );
}