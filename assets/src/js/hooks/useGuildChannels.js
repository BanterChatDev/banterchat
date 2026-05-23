import { apiListChannels } from '../api/channels';
import { useCache, guildCacheKey } from './useCache';

export function useGuildChannels(guildId) {
  const { data, loading, setData, refresh } = useCache(
    guildId ? guildCacheKey('channels', guildId) : null,
    () => apiListChannels(guildId).then(r => Array.isArray(r) ? r : []),
    { initial: [] }
  );
  return { channels: data, loading, setChannels: setData, refresh };
}