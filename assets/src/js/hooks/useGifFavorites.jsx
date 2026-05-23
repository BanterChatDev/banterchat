import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { apiListGifFavorites, apiAddGifFavorite, apiDeleteGifFavorite } from '../api/gifs';
import { useServerList, addItem, removeByField } from './useServerList';

const GifFavoritesContext = createContext(null);

export function GifFavoritesProvider({ children }) {
  const { list, loading, setList, refresh } = useServerList({
    name: 'gif:favorites:all',
    fetch: () => apiListGifFavorites('').then(r => Array.isArray(r) ? r : []),
    events: {
      gifFavoriteAdd: addItem('id'),
      gifFavoriteDelete: removeByField('id', 'id'),
    },
  });

  const byTenor = useMemo(() => {
    const m = new Map();
    for (const f of list) {
      if (f?.tenor_id && !m.has(f.tenor_id)) m.set(f.tenor_id, f.id);
    }
    return m;
  }, [list]);

  const isFavorited = useCallback((tenorId) => !!tenorId && byTenor.has(tenorId), [byTenor]);
  const getFavId = useCallback((tenorId) => (tenorId ? byTenor.get(tenorId) || null : null), [byTenor]);

  const addFavorite = useCallback(async ({ tenorId, url, previewUrl, width, height, description }) => {
    if (!tenorId || !url) return null;
    if (byTenor.has(tenorId)) return byTenor.get(tenorId);
    try {
      const res = await apiAddGifFavorite({
        tab_id: '',
        tenor_id: tenorId,
        url,
        preview_url: previewUrl || url,
        width: width || 0,
        height: height || 0,
        description: description || '',
      });
      const newId = res?.id;
      if (newId) {
        setList(prev => prev.some(f => f.id === newId) ? prev : [...prev, {
          id: newId, tab_id: '', tenor_id: tenorId, url, preview_url: previewUrl || url,
          width: width || 0, height: height || 0, description: description || '',
        }]);
      }
      return newId || null;
    } catch { return null; }
  }, [byTenor, setList]);

  const removeFavorite = useCallback(async (tenorId) => {
    const favId = byTenor.get(tenorId);
    if (!favId) return false;
    setList(prev => prev.filter(f => f.id !== favId));
    try { await apiDeleteGifFavorite(favId); return true; } catch { refresh(); return false; }
  }, [byTenor, setList, refresh]);

  const toggle = useCallback(async (gif) => {
    if (!gif?.tenorId) return;
    if (byTenor.has(gif.tenorId)) await removeFavorite(gif.tenorId);
    else await addFavorite(gif);
  }, [byTenor, addFavorite, removeFavorite]);

  const value = useMemo(() => ({
    isFavorited, getFavId, addFavorite, removeFavorite, toggle, loading,
  }), [isFavorited, getFavId, addFavorite, removeFavorite, toggle, loading]);

  return <GifFavoritesContext.Provider value={value}>{children}</GifFavoritesContext.Provider>;
}

export function useGifFavorites() {
  const ctx = useContext(GifFavoritesContext);
  if (!ctx) {
    return {
      isFavorited: () => false,
      getFavId: () => null,
      addFavorite: async () => null,
      removeFavorite: async () => false,
      toggle: async () => {},
      loading: true,
    };
  }
  return ctx;
}