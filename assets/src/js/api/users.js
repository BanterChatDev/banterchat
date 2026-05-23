import { request, uploadImage } from './client';
import { r } from './routes';

export function apiGetUser(id) {
  return request('GET', r.users.get(id));
}

export function apiGetMutuals(id) {
  return request('GET', r.users.mutuals(id));
}

export function apiListUsers(limit = 50, offset = 0, search = '', includeBanned = false, guildId = '') {
  let url = `${r.users.list()}?limit=${limit}&offset=${offset}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (includeBanned) url += `&include_banned=1`;
  if (guildId) url += `&guild_id=${encodeURIComponent(guildId)}`;
  return request('GET', url);
}

export function apiListChannelMembers(channelId, limit = 50, offset = 0, search = '') {
  let url = `${r.users.listChannelMembers(channelId)}?limit=${limit}&offset=${offset}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return request('GET', url);
}

export function apiUpdateUser(patch) {
  return request('PUT', r.me(), patch);
}

export function apiUploadAvatar(file) { return uploadImage(r.me_avatar(), file, { fallbackName: 'avatar' }); }
export function apiDeleteAvatar() { return request('DELETE', r.me_avatar()); }
export function apiUploadBanner(file, crop) { return uploadImage(r.me_banner(), file, { fallbackName: 'banner', crop }); }
export function apiDeleteBanner() { return request('DELETE', r.me_banner()); }

export function apiGetMyStatus() { return request('GET', r.me_status()); }
export function apiSetPresenceStatus(status) { return request('PUT', r.me_status(), { status }); }

export function apiTerminateUser(id, reason = '') {
  return request('POST', r.users.terminate(id), { reason });
}

export function apiRestoreUser(id) {
  return request('DELETE', r.users.terminate(id));
}

export function apiListTerminations({ limit = 50, offset = 0, search = '' } = {}) {
  let url = `${r.terminations()}?limit=${limit}&offset=${offset}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return request('GET', url);
}

export function apiListGuildBans(guildId) {
  return request('GET', r.guilds.bans(guildId));
}