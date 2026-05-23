import { apiGetUser } from '../../api/users';

// usersById is a pure by-id lookup map used for rendering <@id> mention
// tokens to usernames/avatars. It is intentionally NOT enumerable — there
// is no getCachedUsers() export. Autocomplete sources (slash-arg user,
// @mention) must fetch a scoped list (guild members / channel members) and
// filter that, never the site-wide pool of every user we've ever seen.
const usersById = new Map();

const rolesByGuild = new Map();
const rolePromiseByGuild = new Map();

export async function fetchRolesForGuild(guildId) {
  if (!guildId) return [];
  const cached = rolesByGuild.get(guildId);
  if (cached) return cached;
  const inflight = rolePromiseByGuild.get(guildId);
  if (inflight) return inflight;
  const { apiListRoles } = await import('../../api/roles');
  const p = apiListRoles(guildId).then(res => {
    const roles = Array.isArray(res) ? res : [];
    rolesByGuild.set(guildId, roles);
    rolePromiseByGuild.delete(guildId);
    return roles;
  }).catch(() => { rolePromiseByGuild.delete(guildId); return []; });
  rolePromiseByGuild.set(guildId, p);
  return p;
}

export function getCachedRolesForGuild(guildId) { return rolesByGuild.get(guildId) || []; }

export function getUserById(id) {
  return usersById.get(id) || null;
}

const fetchingUsers = new Map();

export function fetchUserById(id) {
  const found = usersById.get(id);
  if (found) return Promise.resolve(found);
  if (fetchingUsers.has(id)) return fetchingUsers.get(id);
  const p = apiGetUser(id).then(user => {
    fetchingUsers.delete(id);
    if (user && user.id) {
      addUser(user);
      return user;
    }
    return null;
  }).catch(() => { fetchingUsers.delete(id); return null; });
  fetchingUsers.set(id, p);
  return p;
}

export function getRoleById(id, guildId) {
  if (!guildId) return null;
  const roles = rolesByGuild.get(guildId);
  return roles ? roles.find(r => r.id === id) : null;
}

const cacheListeners = new Set();

export function addUser(user) {
  if (!user || !user.id) return;
  const existing = usersById.get(user.id);
  usersById.set(user.id, existing ? { ...existing, ...user } : user);
  cacheListeners.forEach(fn => fn());
}

export function onCacheUpdated(fn) {
  cacheListeners.add(fn);
  return () => cacheListeners.delete(fn);
}

// Role broadcasts carry guild_id — patch only the right guild's cache.
export function updateRoleCache(role) {
  const gid = role?.guild_id;
  if (!gid) return;
  const roles = rolesByGuild.get(gid);
  if (!roles) return;
  const idx = roles.findIndex(r => r.id === role.id);
  if (idx !== -1) roles[idx] = role;
  else roles.push(role);
  rolesByGuild.set(gid, roles);
}

export function removeRoleFromCache(roleId, guildId) {
  if (!guildId) return;
  const roles = rolesByGuild.get(guildId);
  if (!roles) return;
  rolesByGuild.set(guildId, roles.filter(r => r.id !== roleId));
}

import { onPermEvent, getTopRole } from '../../hooks/usePermEvents';
import { cacheStore, registerResetHandler } from '../../cache';

registerResetHandler(() => {
  usersById.clear();
  rolesByGuild.clear();
  rolePromiseByGuild.clear();
  fetchingUsers.clear();
  cacheListeners.forEach(fn => { try { fn(); } catch {} });
});

function getCacheEntry(key) {
  const e = cacheStore.get(key);
  return e ? e.data : null;
}
function setCacheEntry(key, data) {
  cacheStore.set(key, { data, time: Date.now() });
}

onPermEvent('roleCreate', updateRoleCache);
onPermEvent('roleUpdate', updateRoleCache);
onPermEvent('roleDelete', ({ id, guild_id }) => removeRoleFromCache(id, guild_id));

onPermEvent('userUpdate', (data) => {
  if (!data.id) return;
  const key = `user:${data.id}`;
  const existing = getCacheEntry(key);
  if (existing) setCacheEntry(key, { ...existing, ...data });
  const prev = usersById.get(data.id);
  if (prev) {
    usersById.set(data.id, { ...prev, ...data });
    cacheListeners.forEach(fn => fn());
  }
});

onPermEvent('userPresence', (data) => {
  if (!data.user_id) return;
  const patch = {
    presence_status: data.presence_status,
  };
  const key = `user:${data.user_id}`;
  const existing = getCacheEntry(key);
  if (existing) setCacheEntry(key, { ...existing, ...patch });
  const prev = usersById.get(data.user_id);
  if (prev) {
    usersById.set(data.user_id, { ...prev, ...patch });
  }
});

onPermEvent('userOnline', (data) => {
  if (!data.user_id) return;
  const patch = { online: true };
  if (data.presence_status) patch.presence_status = data.presence_status;
  const key = `user:${data.user_id}`;
  const existing = getCacheEntry(key);
  if (existing) setCacheEntry(key, { ...existing, ...patch });
  const prev = usersById.get(data.user_id);
  if (prev) {
    usersById.set(data.user_id, { ...prev, ...patch });
  }
});

onPermEvent('userOffline', (data) => {
  if (!data.user_id) return;
  const patch = { online: false, presence_status: 'offline' };
  const key = `user:${data.user_id}`;
  const existing = getCacheEntry(key);
  if (existing) setCacheEntry(key, { ...existing, ...patch });
  const prev = usersById.get(data.user_id);
  if (prev) {
    usersById.set(data.user_id, { ...prev, ...patch });
  }
});

onPermEvent('userRoleUpdate', (data) => {
  if (!data.id) return;
  const prev = usersById.get(data.id);
  if (!prev) return;
  const roles = data.roles || [];
  const color = getTopRole(roles)?.color;
  usersById.set(data.id, { ...prev, role_color: color, roles });
  cacheListeners.forEach(fn => fn());
});