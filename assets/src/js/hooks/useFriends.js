import { useMemo } from 'react';
import { apiListFriends } from '../api/friends';
import { useServerList } from './useServerList';

const INITIAL = { friends: [], incoming: [], outgoing: [] };

export function useFriends() {
  const { list: data } = useServerList({
    name: 'friends',
    fetch: () => apiListFriends().then(r => r || INITIAL),
    initial: INITIAL,
    refetchOn: ['reconnect', 'friendRequest', 'friendAccepted', 'friendRemoved'],
    events: {},
  });

  const safe = data && data.friends ? data : INITIAL;

  const getStatus = useMemo(() => {
    const friendMap = new Map();
    for (const f of safe.friends) if (f.user?.id) friendMap.set(f.user.id, f.id);
    const outgoingIds = new Set(safe.outgoing.map(o => o.to?.id).filter(Boolean));
    const incomingMap = new Map();
    for (const inc of safe.incoming) if (inc.from?.id) incomingMap.set(inc.from.id, inc.id);
    return (userId) => {
      if (!userId) return { status: 'none' };
      if (friendMap.has(userId)) return { status: 'friends', friendId: friendMap.get(userId) };
      if (outgoingIds.has(userId)) return { status: 'outgoing' };
      if (incomingMap.has(userId)) return { status: 'incoming', requestId: incomingMap.get(userId) };
      return { status: 'none' };
    };
  }, [safe]);

  return { data: safe, getStatus, pendingCount: safe.incoming.length };
}