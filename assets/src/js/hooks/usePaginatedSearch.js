import { useCallback, useRef, useState } from 'react';
import { usePagination, PAGE_SIZE } from './usePagination';

export function usePaginatedSearch({ fetchPage, debounceMs = 300, cacheKey } = {}) {
  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  const debounce = useRef(null);

  const wrappedFetch = useCallback(async (cursor) => {
    const offset = cursor || 0;
    const res = await fetchPage({ offset, limit: PAGE_SIZE, search: searchRef.current });
    const items = res.items || [];
    return { items, cursor: offset + items.length, total: res.total };
  }, [fetchPage]);

  const pagination = usePagination({ fetchPage: wrappedFetch, cacheKey });
  const { resetWithRefresh, loadInitial, reset: resetPagination } = pagination;

  const refreshFromTop = useCallback(() => {
    resetPagination();
    loadInitial();
  }, [resetPagination, loadInitial]);

  const handleSearch = useCallback((eOrStr) => {
    const q = typeof eOrStr === 'string' ? eOrStr : eOrStr?.target?.value || '';
    setSearch(q);
    searchRef.current = q;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(refreshFromTop, debounceMs);
  }, [refreshFromTop, debounceMs]);

  const clearSearch = useCallback(() => {
    setSearch('');
    searchRef.current = '';
    if (debounce.current) clearTimeout(debounce.current);
    refreshFromTop();
  }, [refreshFromTop]);

  return { ...pagination, search, searchRef, handleSearch, clearSearch };
}