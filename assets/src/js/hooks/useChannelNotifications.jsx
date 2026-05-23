import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePermEvents } from './usePermEvents';
import { isMentioned } from '../utils/mentions';
import { resolveDisplayName } from '../utils/displayName';
import { apiGetReads, apiMarkRead } from '../api/reads';
import { apiListNotifPrefs } from '../api/notifprefs';
import { useUIPrefs } from './useUIPrefs';
import { notificationSoundURL } from '../api/sounds';
import { fireDesktopNotification, initDesktopNotifications } from '../utils/desktopNotify';
import { on } from '../eventBus';

let audioInteracted = false;

function applyReads(reads, skipId) {
  const u = {};
  const m = {};
  const chanToGuild = {};
  (reads || []).forEach(r => {
    if (r.guild_id) chanToGuild[r.channel_id] = r.guild_id;
    if (r.channel_id === skipId) return;
    if (r.unread > 0) u[r.channel_id] = r.unread;
    if (r.mentions > 0) m[r.channel_id] = r.mentions;
  });
  return { u, m, chanToGuild };
}

const UnreadContext = createContext(null);

export function UnreadProvider({ children, user }) {
  const [unread, setUnread] = useState({});
  const [mentions, setMentions] = useState({});
  const [chanToGuild, setChanToGuild] = useState({});
  const [activeChannelId, setActiveChannelIdState] = useState(null);
  const audioRef = useRef(null);
  const activeRef = useRef(null);
  const loadedRef = useRef(false);
  const prevActiveRef = useRef(null);
  const markReadTimerRef = useRef(null);

  const clearLocal = useCallback((id) => {
    if (!id) return;
    setUnread(prev => { if (!prev[id]) return prev; const n = { ...prev }; delete n[id]; return n; });
    setMentions(prev => { if (!prev[id]) return prev; const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const setActiveChannelId = useCallback((id) => {
    activeRef.current = id || null;
    setActiveChannelIdState(id || null);
  }, []);

  useEffect(() => {
    if (audioInteracted) return;
    const mark = () => { audioInteracted = true; };
    window.addEventListener('click', mark, { once: true });
    window.addEventListener('keydown', mark, { once: true });
    return () => {
      window.removeEventListener('click', mark);
      window.removeEventListener('keydown', mark);
    };
  }, []);

  const { prefs } = useUIPrefs();
  const soundId = prefs?.notification_sound_id || '';
  const notifPrefsRef = useRef({ guild: {}, channel: {}, global: null });

  useEffect(() => {
    initDesktopNotifications();
  }, []);

  const reloadNotifPrefs = useCallback(() => {
    if (!user?.id) return;
    apiListNotifPrefs().then(list => {
      const next = { guild: {}, channel: {}, global: null };
      (list || []).forEach(p => {
        if (p.scope_type === 'guild' && p.scope_id) next.guild[p.scope_id] = p;
        else if (p.scope_type === 'channel' && p.scope_id) next.channel[p.scope_id] = p;
        else if (p.scope_type === 'global') next.global = p;
      });
      notifPrefsRef.current = next;
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => { reloadNotifPrefs(); }, [reloadNotifPrefs]);

  useEffect(() => on('notifPrefsChanged', reloadNotifPrefs), [reloadNotifPrefs]);

  useEffect(() => {
    audioRef.current = new Audio(notificationSoundURL(soundId));
    audioRef.current.volume = 0.5;
  }, [soundId]);

  useEffect(() => {
    if (!user?.id) return;
    loadedRef.current = false;
    apiGetReads().then(reads => {
      const { u, m, chanToGuild: cg } = applyReads(reads, activeRef.current);
      setUnread(u);
      setMentions(m);
      setChanToGuild(cg);
      loadedRef.current = true;
      if (activeRef.current) {
        apiMarkRead(activeRef.current).catch(() => {});
      }
    }).catch(() => { loadedRef.current = true; });
  }, [user?.id]);

  useEffect(() => {
    if (prevActiveRef.current && prevActiveRef.current !== activeChannelId) {
      apiMarkRead(prevActiveRef.current).catch(() => {});
    }
    prevActiveRef.current = activeChannelId;
    if (!activeChannelId || !loadedRef.current) return;
    clearLocal(activeChannelId);
    apiMarkRead(activeChannelId).catch(() => {});
  }, [activeChannelId, clearLocal]);

  const resolveScopePref = useCallback((channelId) => {
    const np = notifPrefsRef.current;
    const guildId = chanToGuild[channelId];
    return np.channel[channelId] || (guildId && np.guild[guildId]) || np.global || null;
  }, [chanToGuild]);

  const handleIncoming = useCallback((channelId, isImportant, msg) => {
    const isActive = channelId === activeRef.current;
    const focused = typeof document !== 'undefined' && document.hasFocus() && document.visibilityState === 'visible';
    if (isActive && focused) {
      clearTimeout(markReadTimerRef.current);
      markReadTimerRef.current = setTimeout(() => {
        apiMarkRead(channelId).catch(() => {});
      }, 3000);
      return;
    }
    const pref = resolveScopePref(channelId);
    const level = pref?.level || 'mentions';
    if (!isActive) {
      if (level === 'nothing') return;
      if (level === 'mentions' && !isImportant) return;
      setUnread(prev => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
      if (isImportant) {
        setMentions(prev => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
      }
    }
    const shouldNotify = isActive ? isImportant || level !== 'nothing' : true;
    if (!shouldNotify) return;
    if (audioInteracted && audioRef.current) {
      audioRef.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    if (msg) {
      const dispName = resolveDisplayName(msg);
      const title = msg._dm
        ? (dispName || 'New message')
        : `#${msg.channel_name || 'channel'}${dispName ? ` — ${dispName}` : ''}`;
      fireDesktopNotification({
        title,
        body: msg.content || '',
        tag: `chan:${channelId}`,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('focusChannel', { detail: { channelId, guildId: chanToGuild[channelId] } }));
        },
      });
    }
  }, [chanToGuild, resolveScopePref]);

  usePermEvents({
    reconnect: () => {
      apiGetReads().then(reads => {
        const { u, m, chanToGuild: cg } = applyReads(reads, activeRef.current);
        setUnread(u);
        setMentions(m);
        setChanToGuild(cg);
        if (activeRef.current) {
          apiMarkRead(activeRef.current).catch(() => {});
        }
      }).catch(() => {});
    },
    channelMessage: (msg) => {
      if (msg?.channel_id && msg.guild_id !== undefined) {
        setChanToGuild(prev => {
          const existing = prev[msg.channel_id];
          const next = msg.guild_id || '';
          if (existing === next || (!existing && !next)) return prev;
          return { ...prev, [msg.channel_id]: next };
        });
      }
      const subjectId = msg.system_type
        ? (msg.meta && typeof msg.meta === 'object' ? msg.meta.user_id : (() => { try { return JSON.parse(msg.meta || '{}').user_id; } catch { return ''; } })())
        : msg.user_id;
      if (subjectId === user?.id) return;
      const chId = msg.channel_id;
      const isImportant = msg._dm || isMentioned(msg, user, null);
      handleIncoming(chId, isImportant, msg);
    },
    markRead: (data) => {
      if (!data?.channel_id) return;
      clearLocal(data.channel_id);
    },
    interactionReply: (resp) => {
      if (resp.ephemeral || resp.thinking || resp.user_id === user?.id) return;
      const chId = resp.channel_id;
      const isImportant = resp._dm || isMentioned(resp, user, null) || resp.reply?.user_id === user?.id;
      handleIncoming(chId, isImportant, resp);
    },
    notifPrefUpdate: (data) => {
      const np = { ...notifPrefsRef.current };
      np.guild = { ...np.guild };
      np.channel = { ...np.channel };
      if (data.scope_type === 'guild' && data.scope_id) np.guild[data.scope_id] = data;
      else if (data.scope_type === 'channel' && data.scope_id) np.channel[data.scope_id] = data;
      else if (data.scope_type === 'global') np.global = data;
      notifPrefsRef.current = np;
    },
  });

  const markChannelRead = useCallback((channelId) => {
    if (!channelId) return;
    clearLocal(channelId);
    apiMarkRead(channelId).catch(() => {});
  }, [clearLocal]);

  const markGuildRead = useCallback((guildId) => {
    if (!guildId) return;
    const ids = Object.keys(unread).filter(cid => chanToGuild[cid] === guildId);
    ids.forEach(cid => {
      clearLocal(cid);
      apiMarkRead(cid).catch(() => {});
    });
  }, [unread, chanToGuild, clearLocal]);

  const markAllRead = useCallback(() => {
    const ids = Object.keys(unread);
    ids.forEach(cid => {
      clearLocal(cid);
      apiMarkRead(cid).catch(() => {});
    });
  }, [unread, clearLocal]);

  useEffect(() => {
    const onMarkGuild = (e) => markGuildRead(e.detail?.guildId);
    const onMarkAll = () => markAllRead();
    window.addEventListener('markGuildRead', onMarkGuild);
    window.addEventListener('markAllRead', onMarkAll);
    return () => {
      window.removeEventListener('markGuildRead', onMarkGuild);
      window.removeEventListener('markAllRead', onMarkAll);
    };
  }, [markGuildRead, markAllRead]);

  const value = useMemo(() => {
    const guildUnread = {};
    const guildMentions = {};
    for (const [cid, n] of Object.entries(unread)) {
      const gid = chanToGuild[cid];
      if (!gid) continue;
      guildUnread[gid] = (guildUnread[gid] || 0) + n;
    }
    for (const [cid, n] of Object.entries(mentions)) {
      const gid = chanToGuild[cid];
      if (!gid) continue;
      guildMentions[gid] = (guildMentions[gid] || 0) + n;
    }
    return { unread, mentions, guildUnread, guildMentions, chanToGuild, markChannelRead, markGuildRead, markAllRead, setActiveChannelId };
  }, [unread, mentions, chanToGuild, markChannelRead, markGuildRead, markAllRead]);

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

// Reader hook. Always a pure consumer — never sets the active channel.
// Any layout/sidebar component that needs to display unread / mentions /
// guild aggregates imports this. The active channel is owned by the
// component that actually renders the conversation (via useActiveChannel).
export function useChannelNotifications() {
  const ctx = useContext(UnreadContext);
  if (!ctx) return { unread: {}, mentions: {}, guildUnread: {}, guildMentions: {}, chanToGuild: {}, markChannelRead: () => {} };
  return ctx;
}

// Writer hook. Only called by the component that actually displays a
// channel's messages — ChannelView for guild channels and DMs alike.
// Tracks exactly one active channel at a time: when ChannelView mounts
// with channelId X, active becomes X; when it unmounts, active becomes
// null. No other component writes to active, so there's no race, no
// parent/child effect ordering issue.
export function useActiveChannel(channelId) {
  const ctx = useContext(UnreadContext);
  const setActive = ctx?.setActiveChannelId;
  useEffect(() => {
    if (!setActive) return;
    setActive(channelId || null);
    return () => setActive(null);
  }, [setActive, channelId]);
}