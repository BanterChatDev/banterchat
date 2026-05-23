import { useState, useEffect, useCallback } from 'react';

let cache = { id: 'en_us', strings: {} };
let availableCache = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(cache));
}

function useSubscribed() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((x) => x + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
}

function lookup(strings, key) {
  const parts = key.split('.');
  let node = strings;
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[p];
  }
  return typeof node === 'string' ? node : undefined;
}

export async function initI18n() {
  const all = await window.electronAPI.getStrings();
  cache = { id: all.id || 'en_us', strings: all.strings || {} };
  notify();
  return cache;
}

export async function setLanguage(id) {
  const all = await window.electronAPI.setLanguage(id);
  if (all) {
    cache = { id: all.id, strings: all.strings || {} };
    notify();
  }
  return cache;
}

export async function getAvailableLanguages() {
  if (availableCache) return availableCache;
  availableCache = await window.electronAPI.getAvailableLanguages();
  return availableCache;
}

export function useT() {
  useSubscribed();
  return useCallback((key) => lookup(cache.strings, key) ?? key, []);
}

export function useLangId() {
  useSubscribed();
  return cache.id;
}