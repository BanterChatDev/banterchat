import { useState, useEffect, useCallback } from 'react';
import { apiListRoles } from '../api/roles';
import { usePermEvents } from './usePermEvents';
import { registerResetHandler } from '../cache';

const _cacheByGuild = new Map();
const _listenersByGuild = new Map();

registerResetHandler(() => {
  _cacheByGuild.clear();
  for (const list of _listenersByGuild.values()) {
    list.forEach(fn => { try { fn([]); } catch {} });
  }
});

function getListeners(guildId) {
  const key = guildId || '';
  if (!_listenersByGuild.has(key)) _listenersByGuild.set(key, []);
  return _listenersByGuild.get(key);
}

function notify(guildId, roles) {
  const key = guildId || '';
  _cacheByGuild.set(key, roles);
  for (const fn of getListeners(key)) fn(roles);
}

export function useRoleList(guildId) {
  const cacheKey = guildId || '';
  const cached = _cacheByGuild.get(cacheKey) || null;
  const [roles, setRoles] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  const fetch = useCallback(() => {
    apiListRoles(guildId).then(r => {
      const sorted = (r || []).sort((a, b) => (a.position || 0) - (b.position || 0));
      notify(cacheKey, sorted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [guildId, cacheKey]);

  useEffect(() => {
    getListeners(cacheKey).push(setRoles);
    const entry = _cacheByGuild.get(cacheKey);
    if (!entry) fetch();
    else { setRoles(entry); setLoading(false); }
    return () => {
      const arr = getListeners(cacheKey);
      const i = arr.indexOf(setRoles);
      if (i >= 0) arr.splice(i, 1);
    };
  }, [cacheKey, fetch]);

  usePermEvents({
    roleCreate: (role) => {
      // Only accept creates for the guild this hook instance is scoped to.
      if (role.guild_id && guildId && role.guild_id !== guildId) return;
      const prev = _cacheByGuild.get(cacheKey) || [];
      notify(cacheKey, [...prev, role].sort((a, b) => (a.position || 0) - (b.position || 0)));
    },
    roleUpdate: (updated) => {
      if (updated.guild_id && guildId && updated.guild_id !== guildId) return;
      const prev = _cacheByGuild.get(cacheKey) || [];
      notify(cacheKey, prev.map(r => r.id === updated.id ? { ...r, ...updated } : r).sort((a, b) => (a.position || 0) - (b.position || 0)));
    },
    roleDelete: ({ id, guild_id }) => {
      if (guild_id && guildId && guild_id !== guildId) return;
      const prev = _cacheByGuild.get(cacheKey) || [];
      notify(cacheKey, prev.filter(r => r.id !== id));
    },
  });

  return { roles, loading, refresh: fetch };
}