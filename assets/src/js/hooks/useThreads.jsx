import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiListThreads, apiGetThread } from '../api/threads';
import { on } from '../eventBus';

const ThreadContext = createContext(null);

export function ThreadProvider({ children }) {
  const [byId, setById] = useState({});
  const fetchedParentsRef = useRef(new Set());

  const setOne = useCallback((thread) => {
    if (!thread || !thread.id) return;
    setById(prev => ({ ...prev, [thread.id]: thread }));
  }, []);

  const removeOne = useCallback((threadId) => {
    if (!threadId) return;
    setById(prev => {
      if (!prev[threadId]) return prev;
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
  }, []);

  const loadForParent = useCallback(async (parentChannelId, includeArchived = false) => {
    if (!parentChannelId) return [];
    const cacheKey = `${parentChannelId}:${includeArchived ? 'all' : 'active'}`;
    if (fetchedParentsRef.current.has(cacheKey)) {
      return Object.values(byId).filter(t => t.parent_channel_id === parentChannelId);
    }
    fetchedParentsRef.current.add(cacheKey);
    try {
      const list = await apiListThreads(parentChannelId, includeArchived);
      setById(prev => {
        const next = { ...prev };
        (list || []).forEach(t => { next[t.id] = t; });
        return next;
      });
      return list || [];
    } catch {
      fetchedParentsRef.current.delete(cacheKey);
      return [];
    }
  }, [byId]);

  const ensureLoaded = useCallback(async (threadId) => {
    if (!threadId || byId[threadId]) return byId[threadId];
    try {
      const t = await apiGetThread(threadId);
      setOne(t);
      return t;
    } catch {
      return null;
    }
  }, [byId, setOne]);

  useEffect(() => {
    const offCreate = on('threadCreate', (t) => setOne(t));
    const offUpdate = on('threadUpdate', (t) => setOne(t));
    const offDelete = on('threadDelete', (data) => removeOne(data?.id));
    return () => { offCreate(); offUpdate(); offDelete(); };
  }, [setOne, removeOne]);

  const value = useMemo(() => ({
    byId,
    loadForParent,
    ensureLoaded,
    getThreadsForParent: (parentChannelId) => Object.values(byId).filter(t => t.parent_channel_id === parentChannelId),
  }), [byId, loadForParent, ensureLoaded]);

  return <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>;
}

export function useThreads() {
  const ctx = useContext(ThreadContext);
  if (!ctx) throw new Error('useThreads must be used inside ThreadProvider');
  return ctx;
}

export function useThread(threadId) {
  const { byId, ensureLoaded } = useThreads();
  useEffect(() => {
    if (threadId && !byId[threadId]) ensureLoaded(threadId);
  }, [threadId, byId, ensureLoaded]);
  return byId[threadId] || null;
}

export function useThreadsForParent(parentChannelId, includeArchived = false) {
  const { byId, loadForParent } = useThreads();
  useEffect(() => {
    if (parentChannelId) loadForParent(parentChannelId, includeArchived);
  }, [parentChannelId, includeArchived, loadForParent]);
  return useMemo(
    () => Object.values(byId).filter(t => t.parent_channel_id === parentChannelId && (includeArchived || !t.archived)),
    [byId, parentChannelId, includeArchived],
  );
}