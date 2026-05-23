import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchRolesForGuild, getCachedRolesForGuild, onCacheUpdated } from './userCache';
import { getGuildMembers, getDMMembers, fetchGuildMembers, fetchDMMembers, subscribe } from './memberCache';
import { nameMatches } from '../../utils/displayName';
import { usePermEvents } from '../../hooks/usePermEvents';
import { hasPerm, PERM_MENTION_EVERYONE } from '../../permissions';
import { EVERYONE_MENTION, formatUserMention, formatRoleMention } from './patterns';

export function useMention(userId, input, setInput, inputRef, userPerms, channelId, dmPeerId, guildId) {
  const isDM = !!dmPeerId;
  const [, setTick] = useState(0);
  const [mention, setMention] = useState(null);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionMap = useRef(new Map());
  const channelIdRef = useRef(channelId);
  const guildIdRef = useRef(guildId);
  const dmPeerIdRef = useRef(dmPeerId);

  useEffect(() => {
    channelIdRef.current = channelId;
    dmPeerIdRef.current = dmPeerId;
    guildIdRef.current = guildId;
    if (guildId && channelId) {
      if (!getGuildMembers(guildId)) {
        fetchGuildMembers(guildId, channelId);
      }
    } else if (dmPeerId) {
      if (!getDMMembers(dmPeerId)) {
        fetchDMMembers(dmPeerId);
      }
    }
  }, [channelId, dmPeerId, guildId]);

  useEffect(() => subscribe((changedKey) => {
    const gid = guildIdRef.current;
    const pid = dmPeerIdRef.current;
    if (changedKey === gid || changedKey === pid) {
      setTick(t => t + 1);
    }
  }), []);

  useEffect(() => {
    if (guildId) fetchRolesForGuild(guildId).then(() => setTick(t => t + 1));
    return onCacheUpdated(() => setTick(t => t + 1));
  }, [channelId, guildId]);

  usePermEvents({
    roleUpdate: () => setTick(t => t + 1),
    roleDelete: () => setTick(t => t + 1),
    roleCreate: () => setTick(t => t + 1),
    userRoleUpdate: () => setTick(t => t + 1),
  });

  const detect = useCallback((value, cursorPos) => {
    const before = value.slice(0, cursorPos);
    const match = before.match(/@([^\s]*)$/);
    if (!match || (match.index > 0 && before[match.index - 1] !== ' ' && before[match.index - 1] !== '\n')) {
      setMention(null);
      setMentionUsers([]);
      return;
    }
    const query = match[1];
    const members = (guildIdRef.current ? getGuildMembers(guildIdRef.current) : getDMMembers(dmPeerIdRef.current)) || [];
    const userResults = members
      .filter(u => nameMatches(u, query))
      .slice(0, 4)
      .map(u => ({ ...u, _type: 'user' }));
    const roleResults = isDM || !guildId ? [] : getCachedRolesForGuild(guildId)
      .filter(r => r.mentionable && r.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(r => ({ id: r.id, username: r.name, role_color: r.color, _type: 'role' }));
    const canEveryone = !isDM && hasPerm(userPerms || 0, PERM_MENTION_EVERYONE);
    const everyoneMatch = canEveryone && 'everyone'.includes(query.toLowerCase()) ? [{ id: 'everyone', username: 'everyone', role_color: '#f0b232', _type: 'everyone' }] : [];
    const combined = [...everyoneMatch, ...userResults, ...roleResults];
    setMention({ query, startIndex: before.length - match[0].length });
    setMentionUsers(combined);
    setMentionIndex(0);
  }, [userPerms]);

  const select = useCallback((selected) => {
    if (!mention) return;
    const before = input.slice(0, mention.startIndex);
    const after = input.slice(mention.startIndex + 1 + mention.query.length);
    const inserted = `@${selected.username} `;
    setInput(before + inserted + after);
    mentionMap.current.set(selected.username, { id: selected.id, type: selected._type || 'user' });
    setMention(null);
    setMentionUsers([]);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = before.length + inserted.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  }, [mention, input, setInput, inputRef]);

  const buildContent = useCallback((text) => {
    let result = text;
    for (const [username, entry] of mentionMap.current) {
      if (entry.type === 'everyone') {
        result = result.replaceAll(`@${username}`, EVERYONE_MENTION);
      } else {
        const fmt = entry.type === 'role' ? formatRoleMention : formatUserMention;
        result = result.replaceAll(`@${username}`, fmt(entry.id));
      }
    }
    return result;
  }, []);

  const clearMap = useCallback(() => mentionMap.current.clear(), []);

  const dismiss = useCallback(() => { setMention(null); setMentionUsers([]); }, []);

  const handleKeyDown = useCallback((e) => {
    if (!mention || mentionUsers.length === 0) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(prev => (prev + 1) % mentionUsers.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(prev => (prev - 1 + mentionUsers.length) % mentionUsers.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); select(mentionUsers[mentionIndex]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); return true; }
    return false;
  }, [mention, mentionUsers, mentionIndex, select, dismiss]);

  return {
    isActive: !!mention && mentionUsers.length > 0,
    mentionUsers, mentionIndex, setMentionIndex,
    detect, select, buildContent, clearMap, dismiss, handleKeyDown,
  };
}