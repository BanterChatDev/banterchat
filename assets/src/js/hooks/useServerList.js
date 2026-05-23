import { useState, useEffect, useRef, useCallback } from 'react';
import { cacheStore } from '../cache';
import { on } from '../eventBus';

// useServerList — one primitive for any list the server owns and pushes
// updates for. Replaces hand-rolled patterns (useCache + custom
// usePermEvents subscription + CustomEvent listeners + manual reconnect
// refresh) that were duplicated across useGuilds, useDMList, useBlocks,
// etc.
//
// Config shape:
//   name       — cache key + debug label (required)
//   fetch      — async function returning the initial list (required)
//   events     — map of camelCase WS event → (payload, prev) => next
//                Return `prev` unchanged to skip; return a new array to
//                replace state. Synchronous only — the hook re-renders
//                when you return a new reference.
//   idKey      — field name used for default patch/remove helpers
//                (default 'id')
//   ttl        — milliseconds before a visibility-refresh refetches
//                (default 30000; set to 0 to disable visibility refresh)
//   initial    — initial state before the first fetch resolves
//                (default [])
//   refetchOn  — extra WS events that should trigger a full refetch
//                (default ['reconnect']). Pass [] to disable.
//
// Returns { list, loading, setList, refresh }. setList is exposed for
// the rare case a consumer needs to mutate from a click handler; most
// consumers only read `list`.
//
// Helper factories (for common event shapes) are exported alongside:
//   replaceAll()         — event payload IS the new list
//   patchById(idKey?)    — payload is a partial object; merge into
//                          matching entry by id
//   addItem(idKey?)      — payload is a new item; append if not present
//   prependItem(idKey?)  — same but prepend (e.g. dm_reopened)
//   removeById(field?)   — payload has a specific field naming the id
//                          to remove (e.g. user_id for blocks)
//   reorderToTop(match)  — payload -> id via `match`; move item to top
export function useServerList(config) {
  const {
    name,
    fetch,
    events = {},
    ttl = 30000,
    initial = [],
    refetchOn = ['reconnect'],
  } = config;

  const cached = cacheStore.get(name);
  const [list, setListRaw] = useState(cached ? cached.data : initial);
  const [loading, setLoading] = useState(!cached);
  const listRef = useRef(list);
  listRef.current = list;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

  const setList = useCallback((updater) => {
    setListRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cacheStore.set(name, { data: next, time: Date.now() });
      return next;
    });
  }, [name]);

  const refresh = useCallback(async () => {
    try {
      const d = await fetchRef.current();
      const arr = Array.isArray(d) ? d : (d ?? initial);
      cacheStore.set(name, { data: arr, time: Date.now() });
      setListRaw(arr);
      setLoading(false);
      return arr;
    } catch {
      setLoading(false);
      return listRef.current;
    }
  }, [name]);

  // Initial mount: use cache if we have it, otherwise fetch.
  useEffect(() => {
    const entry = cacheStore.get(name);
    if (entry) {
      setListRaw(entry.data);
      setLoading(false);
      if (ttl > 0 && Date.now() - entry.time > ttl) refresh();
    } else {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // WS event subscriptions — declared once, never re-subscribed.
  // Handlers read from eventsRef so they always see the latest closure.
  useEffect(() => {
    const unsubs = [];
    const keys = Object.keys(eventsRef.current);
    for (const key of keys) {
      const off = on(key, (payload) => {
        const fn = eventsRef.current[key];
        if (!fn) return;
        setListRaw(prev => {
          const next = fn(payload, prev);
          if (next === prev || next === undefined) return prev;
          cacheStore.set(name, { data: next, time: Date.now() });
          return next;
        });
      });
      unsubs.push(off);
    }
    return () => unsubs.forEach(u => u());
    // Deps intentionally empty: we subscribe once on mount. Handlers
    // are stored in eventsRef and read fresh on each event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WS reconnect (and any other refetch-triggering events): refetch.
  useEffect(() => {
    if (!refetchOn || refetchOn.length === 0) return;
    const unsubs = refetchOn.map(ev => on(ev, () => refresh()));
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visibility-based staleness refresh.
  useEffect(() => {
    if (ttl <= 0) return;
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      const entry = cacheStore.get(name);
      if (!entry || Date.now() - entry.time > ttl) refresh();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, ttl]);

  return { list, loading, setList, refresh };
}

// ── Helper factories ────────────────────────────────────────────────
// These build event handlers for the most common shapes so individual
// hooks are almost 100% declarative.

// Full replace: payload IS the new list.
export const replaceAll = () => (payload) => Array.isArray(payload) ? payload : [];

// Merge a partial object into the entry matching by idKey.
export const patchById = (idKey = 'id') => (payload, prev) => {
  if (!payload || payload[idKey] == null) return prev;
  let touched = false;
  const next = prev.map(item => {
    if (item[idKey] !== payload[idKey]) return item;
    touched = true;
    return { ...item, ...payload };
  });
  return touched ? next : prev;
};

// Append if not already present.
export const addItem = (idKey = 'id') => (payload, prev) => {
  if (!payload || payload[idKey] == null) return prev;
  if (prev.some(item => item[idKey] === payload[idKey])) return prev;
  return [...prev, payload];
};

// Prepend if not already present.
export const prependItem = (idKey = 'id') => (payload, prev) => {
  if (!payload || payload[idKey] == null) return prev;
  if (prev.some(item => item[idKey] === payload[idKey])) return prev;
  return [payload, ...prev];
};

// Remove the item whose idKey matches payload[field]. `field` names the
// payload property; the stored items are still matched on `idKey`.
export const removeByField = (field, idKey = 'id') => (payload, prev) => {
  const target = payload?.[field];
  if (target == null) return prev;
  const next = prev.filter(item => item[idKey] !== target);
  return next.length === prev.length ? prev : next;
};

// Move the item whose idKey matches `match(payload)` to the top. Used
// by DM list for channel_message reordering.
export const reorderToTop = (match) => (payload, prev) => {
  const id = match(payload);
  if (id == null) return prev;
  const idx = prev.findIndex(item => item.id === id);
  if (idx === -1 || idx === 0) return prev;
  const next = [...prev];
  const [moved] = next.splice(idx, 1);
  next.unshift(moved);
  return next;
};