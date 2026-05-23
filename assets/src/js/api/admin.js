import { request } from './client';
import { r } from './routes';
import { buildAuditLogUrl } from './guilds';

export function apiAdminStats() {
  return request('GET', r.admin.stats());
}

export function apiAdminListUsers({ limit = 50, offset = 0, search = '', includeBanned = false, sort = '', filter = '' } = {}) {
  let url = `${r.admin.users()}?limit=${limit}&offset=${offset}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (includeBanned) url += `&include_banned=1`;
  if (sort) url += `&sort=${encodeURIComponent(sort)}`;
  if (filter) url += `&filter=${encodeURIComponent(filter)}`;
  return request('GET', url);
}

export function apiAdminListGuilds({ limit = 50, offset = 0, search = '', sort = '', filter = '' } = {}) {
  let url = `${r.admin.guilds()}?limit=${limit}&offset=${offset}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sort) url += `&sort=${encodeURIComponent(sort)}`;
  if (filter) url += `&filter=${encodeURIComponent(filter)}`;
  return request('GET', url);
}

export function apiAdminGuildDetail(guildId) {
  return request('GET', r.admin.guild(guildId));
}

export function apiAdminListBots({ limit = 50, offset = 0, search = '', sort = '', filter = '' } = {}) {
  let url = `${r.admin.bots()}?limit=${limit}&offset=${offset}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sort) url += `&sort=${encodeURIComponent(sort)}`;
  if (filter) url += `&filter=${encodeURIComponent(filter)}`;
  return request('GET', url);
}

export function apiAdminBotDetail(appId) {
  return request('GET', r.admin.bot(appId));
}

export function apiAdminTerminateGuild(guildId) {
  return request('POST', r.admin.terminate(guildId));
}

export function apiAdminListListings({ limit = 50, offset = 0, search = '' } = {}) {
  let url = `${r.admin.listings()}?limit=${limit}&offset=${offset}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return request('GET', url);
}

export function apiAdminUnlistListing(guildId) {
  return request('DELETE', r.admin.listing(guildId));
}

export function apiAdminSuspendUser(userId, reason, until) {
  return request('POST', r.admin.suspendUser(userId), { reason: reason || '', until: until || '' });
}

export function apiAdminUnsuspendUser(userId) {
  return request('POST', r.admin.unsuspendUser(userId));
}

export function apiAdminDeleteUser(userId) {
  return request('DELETE', r.admin.deleteUser(userId));
}

export function apiAdminForceLogoutUser(userId) {
  return request('POST', r.admin.forceLogout(userId));
}

export function apiAdminPromoteUser(userId, note) {
  return request('POST', r.admin.promoteUser(userId), { note: note || '' });
}

export function apiAdminDemoteUser(userId) {
  return request('POST', r.admin.demoteUser(userId));
}

export function apiAdminListSiteAdmins() {
  return request('GET', r.admin.siteAdmins());
}

export function apiAdminSuspendGuild(guildId, reason) {
  return request('POST', r.admin.suspendGuild(guildId), { reason: reason || '' });
}

export function apiAdminUnsuspendGuild(guildId) {
  return request('POST', r.admin.unsuspendGuild(guildId));
}

export function apiAdminAuditLog(opts) {
  return request('GET', buildAuditLogUrl(r.admin.auditLog(), opts));
}

export function apiAdminAuditLogExportURL() {
  return r.admin.auditLogExport();
}

export function apiAdminWarnUser(userId, { reasons, note, severity }) {
  return request('POST', r.admin.warn(userId), { reasons: reasons || [], note: note || '', severity: severity || 1 });
}

export function apiAdminListUserWarnings(userId) {
  return request('GET', r.admin.userWarnings(userId));
}

export function apiAdminWarningPresets() {
  return request('GET', r.admin.warningPresets());
}

export function apiAdminRevokeWarning(warningId) {
  return request('DELETE', r.admin.revokeWarning(warningId));
}

export function apiAdminForceClearVanity(guildId, reason, lock) {
  return request('DELETE', r.admin.forceClearVanity(guildId), { reason: reason || '', lock: !!lock });
}

export function apiAdminReserveVanity(slug, reason) {
  return request('POST', r.admin.reserveVanity(), { slug, reason: reason || '' });
}

export function apiAdminListReservedVanities() {
  return request('GET', r.admin.listReservedVanity());
}