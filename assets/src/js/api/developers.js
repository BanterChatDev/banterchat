import { request, uploadImage } from './client';
import { r } from './routes';

export function uploadAppAvatar(appID, file)         { return uploadImage(r.developers.appAvatar(appID), file, { fallbackName: 'avatar' }); }
export function deleteAppAvatar(appID)               { return request('DELETE', r.developers.appAvatar(appID)); }
export function uploadAppBanner(appID, file, crop)   { return uploadImage(r.developers.appBanner(appID), file, { fallbackName: 'banner', crop }); }
export function deleteAppBanner(appID)               { return request('DELETE', r.developers.appBanner(appID)); }
export function listAppCommands(appID)               { return request('GET', r.developers.commands(appID)); }

export async function listApps() {
  const d = await request('GET', r.developers.apps());
  return d.applications || [];
}

export async function createApp(name) {
  return request('POST', r.developers.apps(), { name });
}

export async function getApp(appID) {
  return request('GET', r.developers.app(encodeURIComponent(appID)));
}

export async function updateApp(appID, body) {
  return request('PATCH', r.developers.app(encodeURIComponent(appID)), body);
}

export async function rotateToken(appID) {
  const d = await request('POST', r.developers.appToken(encodeURIComponent(appID)));
  return d.token;
}

export async function deleteApp(appID) {
  return request('DELETE', r.developers.app(encodeURIComponent(appID)));
}

export async function getOauth2AppInfo(clientID) {
  return request('GET', `${r.developers.oauth2.appInfo()}?client_id=${encodeURIComponent(clientID)}`);
}

export async function listManageableGuilds() {
  const d = await request('GET', r.developers.oauth2.manageableGuilds());
  return d.guilds || [];
}

export async function oauth2Authorize(clientID, guildID, permissions) {
  return request('POST', r.developers.oauth2.authorize(), {
    client_id: clientID,
    guild_id: guildID,
    permissions,
  });
}