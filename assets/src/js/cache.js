export const cacheStore = new Map();

const resetHandlers = new Set();

export function registerResetHandler(fn) {
  resetHandlers.add(fn);
  return () => resetHandlers.delete(fn);
}

export function clearCache() {
  cacheStore.clear();
  for (const fn of resetHandlers) {
    try { fn(); } catch {}
  }
}