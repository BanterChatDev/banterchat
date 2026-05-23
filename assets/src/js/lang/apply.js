import { getLangById } from './index';

// Module-level current strings — used ONLY by tBare for non-React call sites
// (formatters, event handlers, contextmenu builders, etc). Components use the
// Context-aware useT() hook in hooks/useT.js, which re-renders properly when
// language changes (same pattern as currentTheme via useUIPrefs).
let currentStrings = {};
let currentId = 'en_us';
const fallback = getLangById('en_us').strings;

function lookup(dict, key) {
  const parts = key.split('.');
  let node = dict;
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[p];
  }
  return typeof node === 'string' ? node : undefined;
}

export function applyLanguage(langObj) {
  if (!langObj || !langObj.strings) return;
  currentStrings = langObj.strings;
  currentId = langObj.id;
  try { localStorage.setItem('_langId', langObj.id); } catch {}
}

export function getCurrentLangID() {
  return currentId;
}

// Used by translateWithStrings() inside useT for component-level lookups
// driven by the currentLang React state (so deps on the t function actually
// invalidate when language changes).
export function translateFrom(strings, key) {
  return lookup(strings, key) ?? lookup(fallback, key) ?? key;
}

// tBare — for non-React call sites only. Reads module state, no subscription.
export function t(key) {
  return lookup(currentStrings, key) ?? lookup(fallback, key) ?? key;
}