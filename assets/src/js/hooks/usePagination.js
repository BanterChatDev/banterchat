import { useState, useRef, useCallback, useEffect } from 'react';
import { getCacheEntry, setCacheEntry } from './useCache';

export const PAGE_SIZE = 50;

export function usePagination({ fetchPage, pageSize = PAGE_SIZE, getKey = (item) => item.id, prepend = false, cacheKey }) {
  const initCache = cacheKey ? getCacheEntry(cacheKey) : null;
  const [items, setItems] = useState(initCache?.items || []);
  const [loading, setLoading] = useState(!initCache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initCache?.hasMore ?? true);
  const [total, setTotal] = useState(initCache?.total ?? null);
  const cursorRef = useRef(initCache?.cursor ?? null);
  const busyRef = useRef(false);
  const versionRef = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  const reset = useCallback(() => {
    versionRef.current++;
    setItems([]);
    setLoading(false);
    setLoadingMore(false);
    setHasMore(true);
    cursorRef.current = null;
    busyRef.current = false;
  }, []);

  const loadInitial = useCallback(async () => {
    const version = ++versionRef.current;
    busyRef.current = true;
    const cached = cacheKeyRef.current ? getCacheEntry(cacheKeyRef.current) : null;
    if (cached) {
      setItems(cached.items);
      setHasMore(cached.hasMore ?? true);
      setTotal(cached.total ?? null);
      cursorRef.current = cached.cursor ?? null;
      setLoading(false);
      busyRef.current = false;
      try {
        const result = await fetchRef.current(null);
        if (version !== versionRef.current) return;
        const list = result.items || [];
        setItems(list);
        setHasMore(list.length >= pageSize);
        if (result.total != null) setTotal(result.total);
        cursorRef.current = result.cursor ?? null;
      } catch {}
      return;
    }
    setLoading(true);
    setHasMore(true);
    cursorRef.current = null;
    try {
      const result = await fetchRef.current(null);
      if (version !== versionRef.current) return;
      const list = result.items || [];
      setItems(list);
      setHasMore(list.length >= pageSize);
      if (result.total != null) setTotal(result.total);
      cursorRef.current = result.cursor ?? null;
    } catch {}
    if (version === versionRef.current) {
      setLoading(false);
      busyRef.current = false;
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    const version = versionRef.current;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const result = await fetchRef.current(cursorRef.current);
      if (version !== versionRef.current) return;
      const list = result.items || [];
      if (result.total != null) setTotal(result.total);
      if (list.length < pageSize) setHasMore(false);
      if (list.length > 0) {
        cursorRef.current = result.cursor ?? cursorRef.current;
        setItems(prev => {
          const keys = new Set(prev.map(getKeyRef.current));
          const fresh = list.filter(item => !keys.has(getKeyRef.current(item)));
          return prepend ? [...fresh, ...prev] : [...prev, ...fresh];
        });
      } else {
        setHasMore(false);
      }
    } catch {}
    if (version === versionRef.current) {
      setLoadingMore(false);
      busyRef.current = false;
    }
  }, [pageSize, prepend]);

  const refresh = useCallback(async () => {
    const version = ++versionRef.current;
    busyRef.current = true;
    cursorRef.current = null;
    try {
      const result = await fetchRef.current(null);
      if (version !== versionRef.current) return;
      const list = result.items || [];
      setItems(list);
      setHasMore(list.length >= pageSize);
      if (result.total != null) setTotal(result.total);
      cursorRef.current = result.cursor ?? null;
    } catch {}
    if (version === versionRef.current) {
      setLoading(false);
      busyRef.current = false;
    }
  }, [pageSize]);

  const cacheTimerRef = useRef(null);
  useEffect(() => {
    if (cacheKeyRef.current && items.length > 0) {
      clearTimeout(cacheTimerRef.current);
      cacheTimerRef.current = setTimeout(() => {
        setCacheEntry(cacheKeyRef.current, { items, cursor: cursorRef.current, hasMore, total });
      }, 500);
    }
    return () => clearTimeout(cacheTimerRef.current);
  }, [items, hasMore, total]);

  return { items, setItems, loading, loadingMore, hasMore, total, setTotal, loadInitial, loadMore, refresh, reset };
}