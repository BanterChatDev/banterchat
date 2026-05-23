import { request } from './client';
import { r } from './routes';

// List + create are guild-scoped. Update / delete stay on /roles/:id —
// backend resolves guild via role→guild lookup.

export async function apiListRoles(guildId) {
  if (!guildId) throw new Error('apiListRoles requires guildId');
  return request('GET', r.roles.list(guildId));
}

export async function apiCreateRole(guildId, name, color, description, permissions, deny, position, mentionable) {
  if (!guildId) throw new Error('apiCreateRole requires guildId');
  return request('POST', r.roles.create(guildId), {
    name,
    color,
    description,
    permissions: permissions || 0,
    deny: deny || 0,
    position: position || 0,
    mentionable: !!mentionable,
  });
}

export async function apiUpdateRole(id, data) {
  return request('PUT', r.roles.update(id), data);
}

export async function apiDeleteRole(id) {
  return request('DELETE', r.roles.delete(id));
}

// Per-guild member role assignment.
export async function apiAddGuildMemberRole(guildId, userId, roleId) {
  if (!guildId) throw new Error('apiAddGuildMemberRole requires guildId');
  return request('PUT', r.guilds.memberRole(guildId, userId, roleId));
}

export async function apiRemoveGuildMemberRole(guildId, userId, roleId) {
  if (!guildId) throw new Error('apiRemoveGuildMemberRole requires guildId');
  return request('DELETE', r.guilds.memberRole(guildId, userId, roleId));
}