import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { apiListDMs } from '../api/dms';
import { useServerList, removeByField, prependItem, reorderToTop, patchById } from './useServerList';

const DMListContext = createContext(null);

// One server-list for DMs. Each convo carries peer_online inline (the
// server includes it on the initial fetch, user_online/user_offline WS
// events patch it in place). Previously this hook ran two parallel
// useServerList calls that both fetched /api/dms on mount — wasted
// round-trip, confusing ownership. Now one list, one fetch.
//
// Event handling:
//   channelMessage   reorder to top (new message in an existing convo)
//                    OR refetch (new convo we haven't seen)
//   dmClosed         remove by conversation_id
//   dmReopened       prepend
//   userOnline       patch { peer_online: true } on the matching convo
//   userOffline      patch { peer_online: false } on the matching convo
//
// The dmConversationCreated CustomEvent is kept as an explicit refetch
// trigger for non-WS code paths (e.g. clicking "Message" on a friend
// card, which calls apiGetOrCreateDM without a corresponding WS event).
export function DMListProvider({ children }) {
  const { list: convos, refresh } = useServerList({
    name: 'dms:convos',
    fetch: () => apiListDMs().then(c => Array.isArray(c) ? c : []),
    events: {
      channelMessage: (msg, prev) => {
        if (!msg?.channel_id || !msg._dm) return prev;
        return reorderToTop(() => msg.channel_id)(msg, prev);
      },
      dmClosed: removeByField('conversation_id', 'id'),
      dmReopened: prependItem('id'),
      userOnline: (payload, prev) =>
        patchById('peer_id')({ peer_id: payload?.user_id, peer_online: true }, prev),
      userOffline: (payload, prev) =>
        patchById('peer_id')({ peer_id: payload?.user_id, peer_online: false }, prev),
    },
  });

  // "First message from someone new" — WS arrives for a convo not yet
  // in our list, trigger a refetch. Can't be a reducer because it's a
  // side-effect (API call), not a pure list transformation.
  useEffect(() => {
    const listener = (msg) => {
      if (!msg?.channel_id || !msg._dm) return;
      if (convos.some(c => c.id === msg.channel_id)) return;
      refresh();
    };
    // Lazy import of on() so we don't pull another surface into the
    // hook's public import list — useServerList already owns the
    // bus subscription lifecycle internally.
    let off;
    import('../eventBus').then(({ on }) => { off = on('channelMessage', listener); });
    return () => { if (off) off(); };
  }, [convos, refresh]);

  // Non-WS convo creation (e.g. opening a DM from a friend card).
  useEffect(() => {
    const onDMCreated = () => refresh();
    window.addEventListener('dmConversationCreated', onDMCreated);
    return () => window.removeEventListener('dmConversationCreated', onDMCreated);
  }, [refresh]);

  // onlineMap is a derived view over convos' peer_online fields — kept
  // for consumers that already expect the { userId: bool } shape.
  const onlineMap = useMemo(() => {
    const m = {};
    for (const c of convos) m[c.peer_id] = !!c.peer_online;
    return m;
  }, [convos]);

  const value = useMemo(() => ({ convos, onlineMap }), [convos, onlineMap]);

  return <DMListContext.Provider value={value}>{children}</DMListContext.Provider>;
}

export function useDMList() {
  const ctx = useContext(DMListContext);
  if (!ctx) return { convos: [], onlineMap: {} };
  return ctx;
}