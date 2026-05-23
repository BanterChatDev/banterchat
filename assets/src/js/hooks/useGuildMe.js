import { useState, useEffect } from 'react';
import { apiGetGuildMe } from '../api/guilds';
import { usePermEvents, applyRoleUpdate, applyRoleDelete } from './usePermEvents';
import { PERM_ADMINISTRATOR } from '../permissions/perms';
import { toBig } from '../permissions/registry';
import { resolvePerms } from '../permissions/resolve';
import { registerResetHandler } from '../cache';

const _cache = new Map();

registerResetHandler(() => _cache.clear());

function decorate(d) {
  if (!d) return d;
  const roles = d.roles || [];
  Object.defineProperty(d, 'permissions', {
    configurable: true,
    enumerable: true,
    get() { return resolvePerms(this.roles || []); },
  });
  d.roles = roles;
  return d;
}

function patchRoles(guildId, nextRoles, setData) {
  const entry = _cache.get(guildId);
  if (!entry) return;
  const next = decorate({ ...entry, roles: nextRoles });
  _cache.set(guildId, next);
  setData(next);
}

export function useGuildMe(guildId, currentUserId) {
  const cached = guildId ? _cache.get(guildId) : null;
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached && !!guildId);
  const [error, setError] = useState(null);

  usePermEvents({
    guildMemberRoleUpdate: (payload) => {
      if (!guildId || payload?.guild_id !== guildId) return;
      if (currentUserId && payload?.user_id !== currentUserId) return;
      apiGetGuildMe(guildId).then(d => {
        const decorated = decorate(d);
        _cache.set(guildId, decorated);
        setData(decorated);
      }).catch(() => {});
    },
    roleUpdate: (updated) => {
      if (!guildId || (updated.guild_id && updated.guild_id !== guildId)) return;
      const entry = _cache.get(guildId);
      if (!entry) return;
      const nextRoles = applyRoleUpdate(entry.roles, updated);
      if (!nextRoles) return;
      patchRoles(guildId, nextRoles, setData);
    },
    roleDelete: ({ id, guild_id }) => {
      if (!guildId || (guild_id && guild_id !== guildId)) return;
      const entry = _cache.get(guildId);
      if (!entry) return;
      const nextRoles = applyRoleDelete(entry.roles, id);
      if (!nextRoles) return;
      patchRoles(guildId, nextRoles, setData);
    },
  });

  useEffect(() => {
    if (!guildId) {
      setData(null);
      setLoading(false);
      return;
    }
    const entry = _cache.get(guildId);
    if (entry) {
      setData(entry);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGetGuildMe(guildId).then(d => {
      const decorated = decorate(d);
      _cache.set(guildId, decorated);
      setData(decorated);
      setLoading(false);
    }).catch(e => {
      setError(e);
      setLoading(false);
    });
  }, [guildId]);

  const can = (perm) => {
    if (!data) return false;
    if (data.is_owner) return true;
    const p = toBig(data.permissions);
    const r = toBig(perm);
    if ((p & toBig(PERM_ADMINISTRATOR)) !== 0n) return true;
    return (p & r) !== 0n;
  };

  return { data, loading, error, can };
}

export function invalidateGuildMe(guildId) {
  if (guildId) _cache.delete(guildId);
  else _cache.clear();
}