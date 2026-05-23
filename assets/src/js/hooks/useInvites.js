import { apiListInvites } from '../api/guilds';
import { useCache, guildCacheKey } from './useCache';
import { usePermEvents } from './usePermEvents';

export function useInvites(guildId) {
  const { data, loading, setData, refresh } = useCache(
    guildId ? guildCacheKey('invites', guildId) : null,
    () => apiListInvites(guildId).then(r => Array.isArray(r) ? r : []),
    { initial: [] }
  );

  usePermEvents({
    inviteUpdate: (p) => {
      if (!guildId || p?.guild_id !== guildId) return;
      setData(prev => (prev || []).map(inv => inv.id === p.id ? { ...inv, uses: p.uses } : inv));
    },
    inviteDelete: (p) => {
      if (!guildId || p?.guild_id !== guildId) return;
      setData(prev => (prev || []).filter(inv => inv.id !== p.id));
    },
  });

  return { invites: data, loading, setInvites: setData, refresh };
}