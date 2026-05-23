import { request, uploadImage } from './client';
import { r } from './routes';

export function apiListGuilds() {
  return request('GET', r.guilds.list());
}

export function apiGetGuild(guildId) {
  return request('GET', r.guilds.get(guildId));
}

export function apiCreateGuild(name, description) {
  return request('POST', r.guilds.create(), { name, description: description || '' });
}

export function apiUpdateGuild(guildId, data) {
  return request('PUT', r.guilds.update(guildId), data);
}

export function apiDeleteGuild(guildId) {
  return request('DELETE', r.guilds.delete(guildId));
}

export function apiGetGuildMember(guildId, userId) {
  return request('GET', r.guilds.member(guildId, userId));
}

export function apiKickGuildMember(guildId, userId) {
  return request('POST', r.guilds.kick(guildId, userId));
}

export function apiBanGuildMember(guildId, userId, reason = '') {
  return request('POST', r.guilds.memberBan(guildId, userId), { reason });
}

export function apiUnbanGuildMember(guildId, userId) {
  return request('DELETE', r.guilds.memberBan(guildId, userId));
}

export function apiListGuildBans(guildId) {
  return request('GET', r.guilds.bans(guildId));
}

export function apiGetGuildMe(guildId) {
  return request('GET', r.guilds.me(guildId));
}

export function apiLeaveGuild(guildId) {
  return request('POST', r.guilds.leave(guildId));
}

export function apiTransferGuildOwnership(guildId, newOwnerId, password) {
  return request('POST', r.guilds.transferOwnership(guildId), { new_owner_id: newOwnerId, password });
}

export function apiCreateInvite(guildId, maxUses = 0, expiresIn = 0) {
  return request('POST', r.guilds.invites(guildId), { max_uses: maxUses, expires_in: expiresIn });
}

export function apiListInvites(guildId) {
  return request('GET', r.guilds.invites(guildId));
}

export function apiDeleteInvite(guildId, code) {
  return request('DELETE', r.guilds.invite(guildId, code));
}

export function apiGetInvitePreview(code) {
  return request('GET', r.invites.preview(code));
}

export function apiJoinByInvite(code) {
  return request('POST', r.invites.join(code));
}

export function apiUploadGuildIcon(guildId, file) {
  return uploadImage(r.guilds.icon(guildId), file, { fallbackName: 'icon' });
}

export function apiDeleteGuildIcon(guildId) {
  return request('DELETE', r.guilds.icon(guildId));
}

export function apiUploadGuildBanner(guildId, file, crop) {
  return uploadImage(r.guilds.banner(guildId), file, { fallbackName: 'banner', crop });
}

export function apiDeleteGuildBanner(guildId) {
  return request('DELETE', r.guilds.banner(guildId));
}

export function apiGetMyGuildProfile(guildId) {
  return request('GET', r.guilds.myProfile(guildId));
}

export function apiUpdateMyGuildProfile(guildId, patch) {
  return request('PUT', r.guilds.myProfile(guildId), patch);
}

export function apiGuildAuditLog(guildId, opts) {
  return request('GET', buildAuditLogUrl(r.guilds.auditLog(guildId), opts));
}

export function buildAuditLogUrl(basePath, { limit = 50, offset = 0, action = '', actorId = '', targetId = '' } = {}) {
  let url = `${basePath}?limit=${limit}&offset=${offset}`;
  if (action) url += `&action=${encodeURIComponent(action)}`;
  if (actorId) url += `&actor_id=${encodeURIComponent(actorId)}`;
  if (targetId) url += `&target_id=${encodeURIComponent(targetId)}`;
  return url;
}