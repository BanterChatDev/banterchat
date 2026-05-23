import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { apiListBlocks, apiListBlockedBy, apiBlockUser, apiUnblockUser } from '../api/blocks';
import { useServerList, addItem, removeByField } from './useServerList';

const BlocksContext = createContext(null);

export function BlocksProvider({ children }) {
  // Outgoing: users this user has blocked. Items are { id, user: {...} }.
  const { list: blocks, loading: blocksLoading, refresh: refreshBlocks } = useServerList({
    name: 'blocks:outgoing',
    fetch: () => apiListBlocks().then(r => Array.isArray(r) ? r : []),
    events: {
      // Server payload: { id, user: { id, username, ... } }
      blockAdd: addItem('id'),
      // Server payload: { user_id } — remove the block whose user.id matches
      blockRemove: (payload, prev) => {
        if (!payload?.user_id) return prev;
        const next = prev.filter(b => b.user?.id !== payload.user_id);
        return next.length === prev.length ? prev : next;
      },
    },
  });

  // Incoming: users who have blocked THIS user. Stored as [{ id }] so
  // we can reuse useServerList's by-id primitives; exposed as a Set
  // via memo below.
  const {
    list: blockedByList,
    loading: blockedByLoading,
    refresh: refreshBlockedBy,
  } = useServerList({
    name: 'blocks:incoming',
    fetch: () => apiListBlockedBy()
      .then(r => Array.isArray(r?.user_ids) ? r.user_ids.map(id => ({ id })) : []),
    events: {
      peerBlocked: (payload, prev) => {
        if (!payload?.user_id) return prev;
        if (prev.some(e => e.id === payload.user_id)) return prev;
        return [...prev, { id: payload.user_id }];
      },
      peerUnblocked: removeByField('user_id', 'id'),
    },
  });

  const refresh = useCallback(async () => {
    await Promise.all([refreshBlocks(), refreshBlockedBy()]);
  }, [refreshBlocks, refreshBlockedBy]);

  const block = useCallback(async (username) => {
    if (!username) return;
    try {
      await apiBlockUser(username);
    } catch (err) {
      const mod = await import('../components/notification/Notifications.jsx');
      mod.notify(err?.message || 'Could not block user', 'error');
      throw err;
    }
  }, []);

  const unblock = useCallback(async (username) => {
    if (!username) return;
    try {
      await apiUnblockUser(username);
    } catch (err) {
      const mod = await import('../components/notification/Notifications.jsx');
      mod.notify(err?.message || 'Could not unblock user', 'error');
      throw err;
    }
  }, []);

  const value = useMemo(() => {
    const idSet = new Set(blocks.map(b => b.user?.id).filter(Boolean));
    const usernameSet = new Set(
      blocks.map(b => b.user?.username?.toLowerCase()).filter(Boolean)
    );
    const bySet = new Set(blockedByList.map(e => e.id));
    return {
      blocks,
      isBlocked: (userId) => idSet.has(userId),
      isBlockedUsername: (username) => !!username && usernameSet.has(username.toLowerCase()),
      isBlockedBy: (userId) => bySet.has(userId),
      refresh,
      block,
      unblock,
      loading: blocksLoading || blockedByLoading,
    };
  }, [blocks, blockedByList, refresh, block, unblock, blocksLoading, blockedByLoading]);

  return <BlocksContext.Provider value={value}>{children}</BlocksContext.Provider>;
}

export function useBlocks() {
  const ctx = useContext(BlocksContext);
  if (!ctx) {
    return {
      blocks: [],
      isBlocked: () => false,
      isBlockedUsername: () => false,
      isBlockedBy: () => false,
      refresh: () => {},
      block: async () => {},
      unblock: async () => {},
      loading: true,
    };
  }
  return ctx;
}