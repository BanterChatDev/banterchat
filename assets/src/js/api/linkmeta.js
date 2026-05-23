import { request } from './client';
import { r } from './routes';
import { registerResetHandler } from '../cache';

const cache = new Map();
const FAILED = Symbol('failed');

registerResetHandler(() => cache.clear());

function cachedFetch(cacheKey, endpoint, isEmpty) {
  if (cache.has(cacheKey)) {
    const hit = cache.get(cacheKey);
    if (hit === FAILED) return Promise.resolve(null);
    return hit;
  }
  const p = request('GET', endpoint)
    .then(data => {
      if (isEmpty(data)) { cache.set(cacheKey, FAILED); return null; }
      cache.set(cacheKey, Promise.resolve(data));
      return data;
    })
    .catch(() => { cache.set(cacheKey, FAILED); return null; });
  cache.set(cacheKey, p);
  return p;
}

export function fetchLinkMeta(url) {
  return cachedFetch(
    `meta:${url}`,
    `${r.proxy.linkMeta()}?url=${encodeURIComponent(url)}`,
    d => !d.title && !d.description && !d.image && !d.player
  );
}

export function fetchOEmbed(oembedUrl) {
  return cachedFetch(
    `oembed:${oembedUrl}`,
    `${r.proxy.oembed()}?url=${encodeURIComponent(oembedUrl)}`,
    d => !d || (!d.title && !d.html)
  );
}

export function prefetchLinkMeta() {}
export function prefetchMessagesLinkMeta() {}