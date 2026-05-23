import { useState, useRef, useCallback } from 'react';
import { usePaginatedSearch } from './usePaginatedSearch';
import { usePermEvents } from './usePermEvents';
import { createMemberHandlers } from '../broadcasts';
import { apiListUsers, apiListChannelMembers } from '../api/users';
import { seedAvatars } from '../utils/avatarStore';
import { addUser } from '../components/mention';

export function useMemberList({ cacheKey, channelId, guildId, syncOnline = false, onRoleUpdate, includeBanned = false } = {}) {
  const [onlineCount, setOnlineCount] = useState(null);
  const [bannedCount, setBannedCount] = useState(null);
  const channelIdRef = useRef(channelId);
  const prevChannelRef = useRef(channelId);
  channelIdRef.current = channelId;

  if (channelId !== prevChannelRef.current) {
    prevChannelRef.current = channelId;
    setOnlineCount(null);
  }

  const fetchPage = useCallback(async ({ offset, limit, search }) => {
    const cid = channelIdRef.current;
    if (!cid && !guildId) return { items: [], total: 0 };
    const res = cid
      ? await apiListChannelMembers(cid, limit, offset, search)
      : await apiListUsers(limit, offset, search, includeBanned, guildId);
    const users = res.users || [];
    seedAvatars(users);
    if (syncOnline) users.forEach(u => addUser(u));
    if (res.online_count != null) setOnlineCount(res.online_count);
    if (res.banned_count != null) setBannedCount(res.banned_count);
    return { items: users, total: res.total };
  }, [syncOnline, includeBanned, guildId]);

  const ps = usePaginatedSearch({ fetchPage, cacheKey });
  const { setItems: setMembers, setTotal, searchRef } = ps;

  const initialReconnect = useRef(true);
  const refetchState = useRef({ timer: null, version: 0 });

  usePermEvents(createMemberHandlers({
    refetchState, channelIdRef, searchRef, setMembers, setTotal, setOnlineCount, setBannedCount,
    syncOnline, onRoleUpdate, initialReconnect, pagination: ps, includeBanned, guildId,
  }));

  return { ...ps, onlineCount, bannedCount };
}