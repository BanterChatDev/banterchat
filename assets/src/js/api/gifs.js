import { request } from './client';
import { r } from './routes';

export function apiGifSearch(query, pos) {
  const qs = new URLSearchParams({ q: query });
  if (pos) qs.set('pos', pos);
  return request('GET', `${r.gifs.search()}?${qs.toString()}`);
}

export function apiGifTrending(pos) {
  const qs = pos ? `?pos=${encodeURIComponent(pos)}` : '';
  return request('GET', `${r.gifs.trending()}${qs}`);
}

export function apiListGifTabs() {
  return request('GET', r.gifs.tabs());
}

export function apiCreateGifTab(name) {
  return request('POST', r.gifs.tabs(), { name });
}

export function apiRenameGifTab(tabId, name) {
  return request('PATCH', r.gifs.tab(tabId), { name });
}

export function apiDeleteGifTab(tabId) {
  return request('DELETE', r.gifs.tab(tabId));
}

export function apiListGifFavorites(tabId) {
  const qs = tabId ? `?tab_id=${encodeURIComponent(tabId)}` : '';
  return request('GET', `${r.gifs.favorites()}${qs}`);
}

export function apiAddGifFavorite(payload) {
  return request('POST', r.gifs.favorites(), payload);
}

export function apiDeleteGifFavorite(favId) {
  return request('DELETE', r.gifs.favorite(favId));
}

export function apiMoveGifFavorite(favId, tabId) {
  return request('PATCH', r.gifs.favorite(favId), { tab_id: tabId || '' });
}