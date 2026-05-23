import { useState, useEffect, useRef } from 'react';
import { on } from '../../eventBus';
import { apiListGuildEmojis, apiListDefaultEmojis, apiListCategoryIcons } from '../../api/emojis';
import { registerResetHandler } from '../../cache';

const DEFAULT_BUCKET = '__default__';
const cache = new Map();
const listeners = new Set();

registerResetHandler(() => {
  cache.clear();
  listeners.forEach(fn => { try { fn(); } catch {} });
});

function entry(guildId) {
  let e = cache.get(guildId);
  if (!e) {
    e = { byId: new Map(), byName: new Map(), ready: false, loading: null };
    cache.set(guildId, e);
  }
  return e;
}

function notify() {
  for (const fn of listeners) fn();
}

function applyAdd(guildId, emoji) {
  if (!emoji || !emoji.id) return;
  const e = entry(guildId);
  const prev = e.byId.get(emoji.id);
  if (prev && prev.name !== emoji.name) {
    if (e.byName.get(prev.name) === prev) e.byName.delete(prev.name);
  }
  e.byId.set(emoji.id, emoji);
  e.byName.set(emoji.name, emoji);
  notify();
}

function applyRemove(guildId, emojiId) {
  const e = cache.get(guildId);
  if (!e) return;
  const prev = e.byId.get(emojiId);
  if (!prev) return;
  e.byId.delete(emojiId);
  if (e.byName.get(prev.name) === prev) e.byName.delete(prev.name);
  notify();
}

on('guildEmojiCreate', (p) => { if (p && p.emoji) applyAdd(p.emoji.guild_id, p.emoji); });
on('guildEmojiUpdate', (p) => { if (p && p.emoji) applyAdd(p.emoji.guild_id, p.emoji); });
on('guildEmojiDelete', (p) => { if (p && p.id && p.guild_id) applyRemove(p.guild_id, p.id); });

function loadGuild(guildId) {
  const e = entry(guildId);
  if (e.ready) return Promise.resolve(e);
  if (e.loading) return e.loading;
  e.loading = apiListGuildEmojis(guildId)
    .then(list => {
      const arr = Array.isArray(list) ? list : [];
      for (const em of arr) {
        e.byId.set(em.id, em);
        e.byName.set(em.name, em);
      }
      e.ready = true;
      e.loading = null;
      notify();
      return e;
    })
    .catch(() => { e.loading = null; return e; });
  return e.loading;
}

export function getGuildEmojiById(guildId, emojiId) {
  if (!guildId) return null;
  const e = cache.get(guildId);
  if (!e) return null;
  return e.byId.get(emojiId) || null;
}

export function getGuildEmojiByName(guildId, name) {
  if (!guildId) return null;
  const e = cache.get(guildId);
  if (!e) return null;
  return e.byName.get(name) || null;
}

export function listGuildEmojis(guildId) {
  if (!guildId) return [];
  const e = cache.get(guildId);
  if (!e) return [];
  return Array.from(e.byId.values());
}

export function useGuildEmojiCache(guildId) {
  const [, setTick] = useState(0);
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;

  useEffect(() => {
    if (!guildId) return;
    loadGuild(guildId);
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, [guildId]);

  if (!guildId) return { byId: new Map(), byName: new Map(), ready: false };
  const e = entry(guildId);
  return { byId: e.byId, byName: e.byName, ready: e.ready };
}

function loadDefaults() {
  const e = entry(DEFAULT_BUCKET);
  if (e.ready) return Promise.resolve(e);
  if (e.loading) return e.loading;
  e.loading = apiListDefaultEmojis()
    .then(list => {
      const arr = Array.isArray(list) ? list : [];
      for (const em of arr) {
        e.byId.set(em.id, em);
        e.byName.set(em.name, em);
      }
      e.ready = true;
      e.loading = null;
      notify();
      return e;
    })
    .catch(() => { e.loading = null; return e; });
  return e.loading;
}

export function getDefaultEmojiById(emojiId) {
  const e = cache.get(DEFAULT_BUCKET);
  if (!e) return null;
  return e.byId.get(emojiId) || null;
}

export function getDefaultEmojiByName(name) {
  const e = cache.get(DEFAULT_BUCKET);
  if (!e) return null;
  return e.byName.get(name) || null;
}

export function listDefaultEmojis() {
  const e = cache.get(DEFAULT_BUCKET);
  if (!e) return [];
  return Array.from(e.byId.values());
}

export function getEmojiByName(name, guildId) {
  if (!name) return null;
  if (guildId) {
    const g = cache.get(guildId);
    if (g) {
      const hit = g.byName.get(name);
      if (hit) return hit;
    }
  }
  const d = cache.get(DEFAULT_BUCKET);
  if (d) {
    const hit = d.byName.get(name);
    if (hit) return hit;
  }
  return null;
}

export function useDefaultEmojis() {
  const [, setTick] = useState(0);
  useEffect(() => {
    loadDefaults();
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const e = cache.get(DEFAULT_BUCKET);
  if (!e) return { byId: new Map(), byName: new Map(), ready: false };
  return { byId: e.byId, byName: e.byName, ready: e.ready };
}

let categoryIconCache = null;
let categoryIconLoading = null;
const categoryIconListeners = new Set();

function loadCategoryIcons() {
  if (categoryIconCache) return Promise.resolve(categoryIconCache);
  if (categoryIconLoading) return categoryIconLoading;
  categoryIconLoading = apiListCategoryIcons()
    .then(list => {
      const arr = Array.isArray(list) ? list : [];
      const map = {};
      for (const ic of arr) {
        if (ic && ic.category && ic.emoji_id) map[ic.category] = ic.emoji_id;
      }
      categoryIconCache = map;
      categoryIconLoading = null;
      for (const fn of categoryIconListeners) fn();
      return map;
    })
    .catch(() => { categoryIconLoading = null; return {}; });
  return categoryIconLoading;
}

export function useCategoryIcons() {
  const [, setTick] = useState(0);
  useEffect(() => {
    loadCategoryIcons();
    const fn = () => setTick(t => t + 1);
    categoryIconListeners.add(fn);
    return () => { categoryIconListeners.delete(fn); };
  }, []);
  return categoryIconCache || {};
}

export function useGuildEmojiSet(guildIds) {
  const [, setTick] = useState(0);
  const idsKey = (guildIds || []).join(',');
  useEffect(() => {
    const ids = (guildIds || []).filter(Boolean);
    for (const gid of ids) loadGuild(gid);
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, [idsKey]);
  const out = {};
  for (const gid of (guildIds || [])) {
    if (!gid) continue;
    const e = cache.get(gid);
    out[gid] = e ? { byId: e.byId, byName: e.byName, ready: e.ready } : { byId: new Map(), byName: new Map(), ready: false };
  }
  return out;
}