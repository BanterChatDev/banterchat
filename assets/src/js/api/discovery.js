import { request } from './client';
import { r } from './routes';

export function apiGetListing(guildId) {
  return request('GET', r.guilds.listing(guildId));
}

export function apiCheckSlug(guildId, slug) {
  const q = encodeURIComponent(slug);
  return request('GET', `${r.guilds.listingCheck(guildId)}?slug=${q}`);
}

export function apiPutListing(guildId, data) {
  return request('PUT', r.guilds.listing(guildId), data);
}

export function apiDeleteListing(guildId) {
  return request('DELETE', r.guilds.listing(guildId));
}