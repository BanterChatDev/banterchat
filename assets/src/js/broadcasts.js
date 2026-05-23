import { getTopRole, applyRoleUpdate, applyRoleDelete, patchUser } from './hooks/usePermEvents';
import { DEFAULT_ROLE_COLOR } from './constants';
import { apiListChannelMembers, apiListUsers, apiGetUser } from './api/users';
import { seedAvatars, setAvatar } from './utils/avatarStore';
import { addUser } from './components/mention';
import { PAGE_SIZE } from './hooks/usePagination';
import { prefetchLinkMeta } from './api/linkmeta';
import { invalidateSlashCommands } from './components/slashcommand/useSlashCommands';
import { invalidateByPrefix } from './hooks/useCache';
import { channelPath, ROUTES } from './routes';

const activeGuildRef = { current: null };

export function setActiveGuild(guildId) {
  activeGuildRef.current = guildId || null;
}

function inActiveGuild(guildId) {
  if (activeGuildRef.current == null) return true;
  return !guildId || guildId === activeGuildRef.current;
}

const sortByPosition = (arr) => arr.sort((a, b) => (a.position || 0) - (b.position || 0));
const updateAndSort = (setter, updated) => setter(prev => sortByPosition(prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)));
const mergeAndSort = (setter, items) => setter(prev => sortByPosition(prev.map(c => { const u = items.find(i => i.id === c.id); return u ? { ...c, ...u } : c; })));

export function createChannelListHandlers({ setChannels, setCategories, navigate }) {
  return {
    channelCreate: (ch) => {
      if (!inActiveGuild(ch.guild_id)) return;
      setChannels(prev => prev.some(c => c.id === ch.id) ? prev : [...prev, ch]);
    },
    channelDelete: ({ id, guild_id }) => {
      if (!inActiveGuild(guild_id)) return;
      setChannels(prev => {
        const next = prev.filter(c => c.id !== id);
        const currentPath = window.location.pathname;
        if (currentPath.includes('/' + id)) {
          const fallback = next.length > 0 ? next[0].id : null;
          const gid = activeGuildRef.current;
          setTimeout(() => {
            if (fallback && gid) navigate(channelPath(gid, fallback));
            else if (gid) navigate(channelPath(gid));
            else navigate(ROUTES.channels);
          }, 0);
        }
        return next;
      });
    },
    channelUpdate: (updated) => {
      if (!inActiveGuild(updated.guild_id)) return;
      setChannels(prev => {
        const exists = prev.find(c => c.id === updated.id);
        if (!exists) return prev;
        return sortByPosition(prev.map(c => c.id === updated.id ? { ...c, ...updated, permission_overrides: updated.permission_overrides || c.permission_overrides } : c));
      });
    },
    channelReorder: (channels) => {
      const sample = channels && channels[0];
      if (sample && !inActiveGuild(sample.guild_id)) return;
      mergeAndSort(setChannels, channels);
    },
    categoryCreate: (cat) => {
      if (!inActiveGuild(cat.guild_id)) return;
      setCategories(prev => prev.some(c => c.id === cat.id) ? prev : [...prev, cat]);
    },
    categoryDelete: ({ id, guild_id }) => {
      if (!inActiveGuild(guild_id)) return;
      setCategories(prev => prev.filter(c => c.id !== id));
      setChannels(prev => prev.map(ch => ch.category_id === id ? { ...ch, category_id: '' } : ch));
    },
    categoryUpdate: (updated) => {
      if (!inActiveGuild(updated.guild_id)) return;
      setCategories(prev => {
        const exists = prev.find(c => c.id === updated.id);
        if (!exists) return prev;
        return sortByPosition(prev.map(c => c.id === updated.id ? { ...c, ...updated, permission_overrides: updated.permission_overrides || c.permission_overrides } : c));
      });
    },
    categoryReorder: (categories) => {
      const sample = categories && categories[0];
      if (sample && !inActiveGuild(sample.guild_id)) return;
      mergeAndSort(setCategories, categories);
    },
    threadCreate: (thread) => {
      const pid = thread?.parent_channel_id;
      if (!pid) return;
      setChannels(prev => prev.map(c => {
        if (c.id !== pid) return c;
        if (thread.archived) {
          return c.has_archived_threads ? c : { ...c, has_archived_threads: true };
        }
        return c.has_threads ? c : { ...c, has_threads: true };
      }));
    },
  };
}

function buildRefetcher(ctx) {
  return () => {
    const { refetchState, channelIdRef, searchRef, setMembers, setTotal, setOnlineCount, setBannedCount, includeBanned, guildId } = ctx;
    const st = refetchState.current;
    clearTimeout(st.timer);
    st.timer = setTimeout(() => {
      const version = ++st.version;
      const cid = channelIdRef.current;
      if (!cid && !guildId) return;
      const fetcher = cid
        ? apiListChannelMembers(cid, PAGE_SIZE, 0, searchRef.current)
        : apiListUsers(PAGE_SIZE, 0, searchRef.current, includeBanned, guildId);
      fetcher.then(res => {
        if (version !== st.version) return;
        const fresh = res.users || [];
        seedAvatars(fresh);
        if (res.online_count != null) setOnlineCount(res.online_count);
        if (res.banned_count != null && setBannedCount) setBannedCount(res.banned_count);
        setMembers(fresh);
        setTotal(res.total);
      }).catch(() => {});
    }, 300);
  };
}

export function createMemberHandlers({ refetchState, channelIdRef, searchRef, setMembers, setTotal, setOnlineCount, setBannedCount, syncOnline, onRoleUpdate, initialReconnect, pagination, includeBanned, guildId }) {
  const ctx = { refetchState, channelIdRef, searchRef, setMembers, setTotal, setOnlineCount, setBannedCount, includeBanned, guildId };
  const refetch = buildRefetcher(ctx);
  return {
    reconnect: () => {
      if (initialReconnect.current) { initialReconnect.current = false; return; }
      refetch();
    },
    channelUpdate: () => {
      if (!channelIdRef.current) return;
      refetch();
    },
    categoryUpdate: () => {
      if (!channelIdRef.current) return;
      refetch();
    },
    userRoleUpdate: ({ id, roles, role, role_color }) => {
      const sorted = roles ? [...roles].sort((a, b) => (a.position || 0) - (b.position || 0)) : null;
      const topColor = sorted ? getTopRole(sorted)?.color : role_color;
      setMembers(prev => prev.map(m => m.id === id ? { ...m, roles: sorted || m.roles, role: role || m.role, role_color: topColor || m.role_color } : m));
      if (onRoleUpdate) onRoleUpdate({ id, roles: sorted, role, role_color: topColor });
    },
    guildMemberRoleUpdate: ({ guild_id, user_id, roles }) => {
      if (guildId && guild_id !== guildId) return;
      const sorted = roles ? [...roles].sort((a, b) => (a.position || 0) - (b.position || 0)) : null;
      const top = sorted ? getTopRole(sorted) : null;
      setMembers(prev => prev.map(m => m.id === user_id ? {
        ...m,
        roles: sorted || m.roles,
        role: top?.name || m.role,
        role_color: top?.color || m.role_color,
      } : m));
      if (onRoleUpdate) onRoleUpdate({ id: user_id, roles: sorted, role: top?.name, role_color: top?.color });
    },
    roleUpdate: (updated) => {
      setMembers(prev => prev.map(m => {
        const newRoles = applyRoleUpdate(m.roles, updated);
        if (!newRoles) return m;
        return { ...m, roles: newRoles, role_color: newRoles[0]?.color || m.role_color };
      }));
    },
    roleDelete: ({ id }) => {
      setMembers(prev => prev.map(m => {
        const newRoles = applyRoleDelete(m.roles, id);
        if (!newRoles) return m;
        return { ...m, roles: newRoles, role_color: newRoles[0]?.color || DEFAULT_ROLE_COLOR };
      }));
    },
    userUpdate: (data) => {
      if (data.id) setMembers(prev => prev.map(m => m.id === data.id ? patchUser(m, data) : m));
    },
    userOnline: ({ user_id, presence_status }) => {
      if (guildId) return;
      setMembers(prev => {
        const existing = prev.find(m => m.id === user_id);
        if (existing) {
          if (!existing.online) {
            setOnlineCount(prevCount => prevCount == null ? prevCount : prevCount + 1);
          }
          return prev.map(m => m.id === user_id ? { ...m, online: true, presence_status: presence_status || 'online' } : m);
        }
        if (!channelIdRef.current) {
          apiGetUser(user_id).then(user => {
            if (!user) return;
            setMembers(p => p.some(m => m.id === user_id)
              ? p.map(m => m.id === user_id ? { ...m, online: true, presence_status: presence_status || 'online' } : m)
              : [{ ...user, online: true, presence_status: presence_status || 'online' }, ...p]);
            setOnlineCount(prevCount => prevCount == null ? prevCount : prevCount + 1);
          }).catch(() => {});
        }
        return prev;
      });
    },
    userOffline: ({ user_id }) => {
      setMembers(prev => {
        const existed = prev.find(m => m.id === user_id);
        if (existed && existed.online) {
          setOnlineCount(prevCount => prevCount == null ? prevCount : Math.max(0, prevCount - 1));
        }
        return prev.map(m => m.id === user_id ? { ...m, online: false, presence_status: 'offline' } : m);
      });
    },
    userPresence: ({ user_id, presence_status }) => {
      setMembers(prev => prev.map(m => m.id === user_id ? { ...m, presence_status } : m));
    },
    guildMemberProfile: ({ guild_id, user_id, nickname }) => {
      if (guildId && guild_id !== guildId) return;
      setMembers(prev => prev.map(m => {
        if (m.id !== user_id) return m;
        if (nickname === undefined) return m;
        return { ...m, display_name: nickname || m.username };
      }));
    },
    guildPresence: ({ guild_id, user_id, online, presence_status, online_count, total, member }) => {
      if (!guildId || guild_id !== guildId) return;
      if (online_count != null) setOnlineCount(online_count);
      if (total != null) setTotal(total);
      if (!user_id) return;
      const status = presence_status || (online ? 'online' : 'offline');
      setMembers(prev => {
        const existing = prev.find(m => m.id === user_id);
        if (existing) {
          return prev.map(m => m.id === user_id ? { ...m, online: !!online, presence_status: status } : m);
        }
        if (online && member && member.id) {
          seedAvatars([member]);
          return [...prev, { ...member, online: true, presence_status: status }];
        }
        return prev;
      });
    },
    userTerminate: ({ user_id }) => {
      setMembers(prev => prev.filter(m => m.id !== user_id));
      refetch();
    },
    userRestore: () => {
      refetch();
    },
    guildBanAdd: ({ guild_id, user_id }) => {
      if (guildId && guild_id !== guildId) return;
      setMembers(prev => prev.filter(m => m.id !== user_id));
      refetch();
    },
    guildBanRemove: ({ guild_id }) => {
      if (guildId && guild_id !== guildId) return;
      refetch();
    },
    guildMemberAdd: ({ guild_id, user_id, is_bot, member }) => {
      if (guildId && guild_id !== guildId) return;
      if (is_bot) invalidateSlashCommands(guild_id);
      if (member && member.id) {
        seedAvatars([member]);
        setMembers(prev => prev.some(m => m.id === member.id) ? prev : [...prev, member]);
        setTotal(t => (t == null ? t : t + 1));
        if (member.online) setOnlineCount(c => (c == null ? c : c + 1));
        return;
      }
      refetch();
    },
    guildMemberRemove: ({ guild_id, user_id }) => {
      if (guildId && guild_id !== guildId) return;
      setMembers(prev => {
        const removed = prev.find(m => m.id === user_id);
        if (removed && removed.online) setOnlineCount(c => (c == null ? c : Math.max(0, c - 1)));
        return prev.filter(m => m.id !== user_id);
      });
      setTotal(t => (t == null ? t : Math.max(0, t - 1)));
    },
    botCommandsUpdated: ({ guild_id }) => {
      invalidateSlashCommands(guild_id);
    },
  };
}

export function createMessageHandlers({ channelId, user, setMessages, messagesRef, nearBottom, recomputeNearBottom, onPeerMessage, onOwnMessageConfirmed, seenMsgIds }) {
  return {
    channelMessage: (msg) => {
      if (msg.channel_id !== channelId) return;
      if (seenMsgIds.current.has(msg.id)) return;
      seenMsgIds.current.add(msg.id);
      if (!msg.embed && msg.content) prefetchLinkMeta(msg.content);
      recomputeNearBottom();
      const wasNearBottom = nearBottom.current;
      const isOwnMessage = msg.user_id === user?.id;
      let replaced = false;
      setMessages(prev => {
        const pi = isOwnMessage ? prev.findIndex(m => m._pending && m._tempContent === msg.content) : -1;
        if (pi !== -1) { replaced = true; const next = [...prev]; next[pi] = msg; return next; }
        return prev.some(m => m.id === msg.id) ? prev : [...prev, msg];
      });
      if (replaced) {
        onOwnMessageConfirmed();
      } else if (isOwnMessage || wasNearBottom) {
        onPeerMessage(wasNearBottom || isOwnMessage);
      }
    },
    messageDelete: ({ id, channel_id }) => {
      if (channel_id !== channelId) return;
      setMessages(prev => prev.filter(m => m.id !== id).map(m =>
        m.reply_to === id ? { ...m, reply: { id, deleted: true } } : m
      ));
    },
    messageDeleteBulk: ({ ids, channel_id }) => {
      if (channel_id !== channelId) return;
      const idSet = new Set(ids);
      setMessages(prev => prev.filter(m => !idSet.has(m.id)).map(m =>
        m.reply_to && idSet.has(m.reply_to) ? { ...m, reply: { id: m.reply_to, deleted: true } } : m
      ));
    },
    messageEdit: ({ id, channel_id, content }) => {
      if (channel_id !== channelId) return;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m));
    },
    messageUpdate: ({ id, channel_id, content, embed, components }) => {
      if (channel_id !== channelId) return;
      setMessages(prev => prev.map(m => {
        if (m.id !== id) return m;
        const next = { ...m };
        if (content !== undefined && content !== '') next.content = content;
        if (embed !== undefined) next.embed = embed;
        if (components !== undefined) next.components = components;
        return next;
      }));
    },
    reactionAdd: ({ message_id, channel_id, emoji_id, name, user_id, count, username }) => {
      if (channel_id !== channelId) return;
      setMessages(prev => prev.map(m => {
        if (m.id !== message_id) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex(r => r.emoji_id === emoji_id);
        const me = user_id === user?.id;
        if (idx >= 0) {
          const users = [...(reactions[idx].users || [])];
          if (username && !users.includes(username)) {
            users.push(username);
            if (users.length > 3) users.shift();
          }
          reactions[idx] = { ...reactions[idx], count, me: reactions[idx].me || me, users };
        } else {
          reactions.push({ emoji_id, name, count, me, users: username ? [username] : [] });
        }
        return { ...m, reactions };
      }));
    },
    reactionRemove: ({ message_id, channel_id, emoji_id, user_id, count, username }) => {
      if (channel_id !== channelId) return;
      setMessages(prev => prev.map(m => {
        if (m.id !== message_id) return m;
        const reactions = (m.reactions || []).map(r => {
          if (r.emoji_id !== emoji_id) return r;
          const me = user_id === user?.id ? false : r.me;
          const users = username ? (r.users || []).filter(u => u !== username) : (r.users || []);
          return { ...r, count, me, users };
        }).filter(r => r.count > 0);
        return { ...m, reactions };
      }));
    },
    userUpdate: (data) => {
      if (!data?.id) return;
      const id = data.id;
      const patch = {};
      if (data.avatar_id !== undefined) patch.avatar_id = data.avatar_id;
      if (data.username !== undefined) patch.username = data.username;
      if (data.display_name !== undefined) patch.display_name = data.display_name;
      if (Object.keys(patch).length === 0) return;
      if (!messagesRef.current.some(m => m.user_id === id)) return;
      setMessages(prev => prev.map(m => m.user_id === id ? { ...m, ...patch } : m));
    },
    embedUpdate: ({ id, channel_id, embed }) => {
      if (channel_id !== channelId) return;
      if (!messagesRef.current.some(m => m.id === id)) return;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, embed } : m));
    },
    userRoleUpdate: ({ id, roles }) => {
      if (!Array.isArray(roles)) return;
      if (!messagesRef.current.some(m => m.user_id === id)) return;
      const top = getTopRole(roles);
      setMessages(prev => prev.map(m => m.user_id === id ? { ...m, role: top?.name, role_color: top?.color } : m));
    },
    guildMemberRoleUpdate: ({ user_id, roles }) => {
      if (!Array.isArray(roles)) return;
      if (!messagesRef.current.some(m => m.user_id === user_id)) return;
      const top = getTopRole(roles);
      setMessages(prev => prev.map(m => m.user_id === user_id ? { ...m, role: top?.name, role_color: top?.color } : m));
    },
  };
}

export function createProfileHandlers(userId, setProfile) {
  return {
    userUpdate: (data) => {
      if (data.id === userId) setProfile(prev => prev ? patchUser(prev, data) : prev);
    },
  };
}

export function createSessionHandlers(reload) {
  return {
    sessionChange: () => reload(),
    sessionRevoked: () => reload(),
  };
}

export function createGifHandlers({ onTabCreate, onTabRename, onTabDelete, onFavoriteAdd, onFavoriteDelete, onFavoriteMove }) {
  return {
    gifTabCreate: (data) => onTabCreate?.(data),
    gifTabRename: (data) => onTabRename?.(data),
    gifTabDelete: (data) => onTabDelete?.(data),
    gifFavoriteAdd: (data) => onFavoriteAdd?.(data),
    gifFavoriteDelete: (data) => onFavoriteDelete?.(data),
    gifFavoriteMove: (data) => onFavoriteMove?.(data),
  };
}

export function createUserHandlers(user, setUser) {
  return {
    userUpdate: (data) => {
      if (data.id === user?.id) {
        if (data.avatar_id !== undefined) setAvatar(data.id, data.avatar_id);
        setUser(prev => patchUser(prev, data));
      }
    },
    userPresence: (data) => {
      if (data.user_id === user?.id) {
        setUser(prev => patchUser(prev, {
          presence_status: data.presence_status,
        }));
      }
    },
    keyfileChange: (data) => {
      setUser(prev => patchUser(prev, {
        has_keyfile: data.has_keyfile,
        keyfile_fingerprint: data.keyfile_fingerprint,
      }));
    },
  };
}

export function createGlobalHandlers() {
  return {
    guildMemberAdd: ({ guild_id, is_bot }) => {
      if (is_bot) invalidateSlashCommands(guild_id);
      invalidateByPrefix('members');
    },
    guildMemberRemove: () => { invalidateByPrefix('members'); },
    guildBanAdd:       () => { invalidateByPrefix('members'); },
    guildBanRemove:    () => { invalidateByPrefix('members'); },
    userTerminate:     () => { invalidateByPrefix('members'); },
    userRestore:       () => { invalidateByPrefix('members'); },
    botCommandsUpdated: ({ guild_id }) => { invalidateSlashCommands(guild_id); },
    adminUserKick: ({ kind, reason }) => {
      window.dispatchEvent(new CustomEvent('wsAdminKick', { detail: { kind, reason } }));
    },
    userTerminated: (payload) => {
      const detail = {
        kind: 'banned',
        reason: payload?.reason || '',
        banned_by: payload?.terminated_by || '',
        banned_by_username: payload?.terminated_by_username || '',
        created_at: payload?.created_at || '',
      };
      window.dispatchEvent(new CustomEvent('wsAdminKick', { detail }));
      window.dispatchEvent(new CustomEvent('openBanModal', { detail }));
    },
  };
}