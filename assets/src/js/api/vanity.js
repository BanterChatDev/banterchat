import { request } from './client';
import { r } from './routes';

export function apiGetVanity(guildId) {
  return request('GET', r.guilds.vanity(guildId));
}

export function apiSetVanity(guildId, slug) {
  return request('PUT', r.guilds.vanity(guildId), { slug });
}

export function apiRemoveVanity(guildId) {
  return request('DELETE', r.guilds.vanity(guildId));
}