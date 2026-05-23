import { useState, useEffect, useRef, useCallback } from 'react';

import { cacheStore } from '../cache';

export function getCacheEntry(key) {
  const e = cacheStore.get(key);
  return e ? e.data : null;
}

export function setCacheEntry(key, data) {
  cacheStore.set(key, { data, time: Date.now() });
}

// Builds a per-guild cache key so different guilds don't share cached state.
// Usage: useCache(guildCacheKey('channels', guildId), fetcher).
// If guildId is falsy, falls back to the bare namespace — preserves legacy
// cache behavior for components not yet guild-scoped.
export function guildCacheKey(namespace, guildId) {
  if (!guildId) return namespace;
  return `${namespace}:${guildId}`;
}

// Invalidates every cache entry matching a namespace prefix. Called when
// the user leaves a guild or switches so stale lists don't resurface.
export function invalidateByPrefix(prefix) {
  for (const key of cacheStore.keys()) {
    if (key === prefix || key.startsWith(prefix + ':')) {
      cacheStore.delete(key);
    }
  }
}

export function useCache(key, fetcher, opts = {}) {
  const cached = key ? cacheStore.get(key) : null;
  const [data, setDataRaw] = useState(cached ? cached.data : (opts.initial ?? null));
  // When key is null, the hook deliberately does not fetch. Treat this as
  // "idle, not loading" rather than "loading forever". Phase 5b exposed
  // this: ChannelLayout in DM mode passes null keys and would otherwise
  // spin the loading spinner indefinitely.
  const [loading, setLoading] = useState(!!key && !cached);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const keyRef = useRef(key);
  keyRef.current = key;

  const setData = useCallback((updater) => {
    setDataRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (keyRef.current) cacheStore.set(keyRef.current, { data: next, time: Date.now() });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!key) return;
    const entry = cacheStore.get(key);
    if (entry) {
      setDataRaw(entry.data);
      setLoading(false);
      const ttl = optsRef.current.ttl ?? 30000;
      if (Date.now() - entry.time > ttl) {
        fetcherRef.current().then(d => {
          cacheStore.set(key, { data: d, time: Date.now() });
          setDataRaw(d);
        }).catch(() => {});
      }
    } else {
      setLoading(true);
      fetcherRef.current().then(d => {
        cacheStore.set(key, { data: d, time: Date.now() });
        setDataRaw(d);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      const entry = cacheStore.get(key);
      const ttl = optsRef.current.ttl ?? 30000;
      if (!entry || Date.now() - entry.time > ttl) {
        fetcherRef.current().then(d => {
          cacheStore.set(key, { data: d, time: Date.now() });
          setDataRaw(d);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [key]);

  const refresh = useCallback(async () => {
    const d = await fetcherRef.current();
    if (keyRef.current) cacheStore.set(keyRef.current, { data: d, time: Date.now() });
    setDataRaw(d);
    return d;
  }, []);

  return { data, loading, setData, refresh };
}