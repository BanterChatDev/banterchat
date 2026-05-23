import { apiListGuilds } from '../api/guilds';
import { useServerList, replaceAll, patchById } from './useServerList';

// The user's guild sidebar data source. Server pushes "guild_list"
// (full replace) on every membership change — create, join, leave,
// ban-out, delete. "guild_update" is a partial patch for icon/banner/
// name edits. That's the entire contract; no refresh() call sites
// remain in the rest of the app.
export function useGuilds() {
  const { list, loading, setList } = useServerList({
    name: 'guilds',
    fetch: () => apiListGuilds().then(r => Array.isArray(r) ? r : []),
    ttl: 60000,
    events: {
      guildList: replaceAll(),
      guildUpdate: patchById('id'),
    },
  });
  return { guilds: list, loading, setGuilds: setList };
}