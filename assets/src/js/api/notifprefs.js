import { request } from './client';
import { r } from './routes';

export function apiListNotifPrefs() {
  return request('GET', r.notifPrefs());
}

export function apiGetGlobalNotifPref() {
  return request('GET', r.notifPrefsGlobal());
}

export function apiSetGlobalNotifPref(pref) {
  return request('PUT', r.notifPrefsGlobal(), pref);
}

export function apiGetGuildNotifPref(guildId) {
  return request('GET', r.notifPrefsGuild(guildId));
}

export function apiSetGuildNotifPref(guildId, pref) {
  return request('PUT', r.notifPrefsGuild(guildId), pref);
}

export function apiGetChannelNotifPref(channelId) {
  return request('GET', r.notifPrefsChannel(channelId));
}

export function apiSetChannelNotifPref(channelId, pref) {
  return request('PUT', r.notifPrefsChannel(channelId), pref);
}

export function apiResetNotifPref(scopeType, scopeId) {
  return request('DELETE', r.notifPrefsReset(scopeType, scopeId));
}