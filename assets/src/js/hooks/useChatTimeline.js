import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { t as tBare } from '../lang/apply';
import { apiListMessages, apiListMessagesAfter, apiListMessagesAround } from '../api/messages';
import { usePagination } from './usePagination';
import { usePermEvents } from './usePermEvents';
import { useAutoScroll } from './useAutoScroll';
import { resolveOptimisticNameColor } from '../utils/userColor';
import { createMessageHandlers } from '../broadcasts';
import { on } from '../eventBus';
import { noteRateLimited, isLimited } from '../rateLimit';

const PAGE_SIZE = 50;
const THINKING_TIMEOUT_MS = 10000;
const SEND_OFFLINE_GRACE_MS = 3000;

export function useChatTimeline({ channelId, user, guildMe, isDM }) {
  const scroll = useAutoScroll();
  const {
    containerRef, bottomRef, nearBottom, recomputeNearBottom,
    handleScroll, reset: resetScroll,
    onInitialLoad, onOwnMessageSent, onOwnMessageConfirmed, onPeerMessage, onDelayedReply, onReconnectReplay, onJumpToPresent,
    thresholds,
  } = scroll;

  const fetchMessages = useCallback(async (cursor) => {
    const msgs = await apiListMessages(channelId, cursor);
    const list = msgs || [];
    return { items: list, cursor: list.length > 0 ? list[0].created_at : null };
  }, [channelId]);

  const {
    items: messages, setItems: setMessages,
    loading, loadingMore, hasMore,
    loadInitial, loadMore, reset: resetPagination,
  } = usePagination({ fetchPage: fetchMessages, prepend: true, cacheKey: `messages:${channelId}` });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [scrollReady, setScrollReady] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);

  const seenMsgIds = useRef(new Set());
  const thinkingTimers = useRef(new Map());
  const afterCursorRef = useRef(null);
  const prevChannelRef = useRef(channelId);

  useEffect(() => {
    return () => {
      for (const t of thinkingTimers.current.values()) clearTimeout(t);
      thinkingTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    prevChannelRef.current = channelId;
    resetScroll();
    setViewingHistory(false);
    setHasNewer(false);
    afterCursorRef.current = null;
    seenMsgIds.current = new Set();
    for (const t of thinkingTimers.current.values()) clearTimeout(t);
    thinkingTimers.current.clear();
    setScrollReady(false);
    loadInitial().then(() => {
      onInitialLoad();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setScrollReady(true));
      });
    });
  }, [channelId]);

  const initialRef = useRef(true);
  useEffect(() => {
    const onReconnect = () => {
      if (initialRef.current) { initialRef.current = false; return; }
      apiListMessages(channelId).then(msgs => {
        if (!msgs || msgs.length === 0) return;
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const fresh = msgs.filter(m => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          return [...prev, ...fresh].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        onReconnectReplay();
      }).catch(() => {});
    };
    window.addEventListener('wsReconnect', onReconnect);
    return () => window.removeEventListener('wsReconnect', onReconnect);
  }, [channelId]);

  useEffect(() => {
    const dismiss = (e) => {
      const id = e.detail?.id;
      if (!id) return;
      setMessages(prev => prev.filter(m => m.id !== id));
    };
    window.addEventListener('dismissMessage', dismiss);
    return () => window.removeEventListener('dismissMessage', dismiss);
  }, [channelId]);

  useEffect(() => {
    return on('error', (data) => {
      if (data?.code === 'rate_limited' && typeof data.retry_after === 'number') {
        noteRateLimited(data.retry_after);
      }
      const id = data?.message_id;
      if (!id) return;
      setMessages(prev => {
        if (!prev.find(m => m.id === id && m._pending)) return prev;
        return prev.map(m => m.id === id ? { ...m, _pending: false, _failed: true, _ephemeral: true } : m);
      });
    });
  }, []);

  const timeoutThinkingRow = useCallback((msgId) => {
    thinkingTimers.current.delete(msgId);
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      if (!prev[idx]._thinking) return prev;
      const next = [...prev];
      next[idx] = { ...prev[idx], _thinking: false, _timedOut: true, content: tBare('messages.command_app_timeout') };
      return next;
    });
  }, [setMessages]);

  const messageHandlers = useMemo(
    () => createMessageHandlers({ channelId, user, setMessages, messagesRef, nearBottom, recomputeNearBottom, onPeerMessage, onOwnMessageConfirmed, seenMsgIds }),
    [channelId, user, setMessages, recomputeNearBottom, onPeerMessage, onOwnMessageConfirmed]
  );
  usePermEvents({
    ...messageHandlers,
    interactionError: (resp) => {
      if (resp.channel_id && resp.channel_id !== channelId) return;
      const kind = resp.kind || 'slash';
      const text = resp.message || tBare('notifications.action_failed');
      const rowId = '_cmderr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      setMessages(prev => [...prev, {
        id: rowId,
        channel_id: channelId,
        user_id: user?.id || '',
        username: user?.username || '',
        display_name: user?.display_name || '',
        avatar_id: user?.avatar_id || '',
        content: text,
        attachments: [],
        created_at: new Date().toISOString(),
        _command: kind === 'slash',
        _commandName: resp.command || '',
        _commandArgs: '',
        _ephemeral: true,
        _commandError: true,
      }]);
    },
    interactionReply: (resp) => {
      if (resp.channel_id !== channelId) return;
      const isThinking = !!resp.thinking;
      const nonce = resp.nonce || '';
      const realId = resp.id || '';
      const rowId = isThinking
        ? (nonce || '_cmd_' + Math.random().toString(36).slice(2))
        : (realId || nonce || '_cmd_' + Math.random().toString(36).slice(2));
      const msg = {
        ...resp,
        id: rowId,
        interaction_id: resp.interaction_id || nonce || '',
        created_at: resp.created_at || new Date().toISOString(),
        attachments: resp.attachments || [],
        invoker_role_color: isDM ? '' : (resp.invoker_role_color || ''),
        _command: true,
        _commandName: resp.command || '',
        _commandArgs: resp.args || '',
        _ephemeral: resp.ephemeral,
        _thinking: isThinking,
      };
      const thinkingKey = nonce || rowId;
      const existing = thinkingTimers.current.get(thinkingKey);
      if (existing) { clearTimeout(existing); thinkingTimers.current.delete(thinkingKey); }
      if (msg._thinking) {
        const timerId = setTimeout(() => timeoutThinkingRow(thinkingKey), THINKING_TIMEOUT_MS);
        thinkingTimers.current.set(thinkingKey, timerId);
      }
      setMessages(prev => {
        const idx = nonce
          ? prev.findIndex(m => m.id === nonce || m.interaction_id === nonce)
          : prev.findIndex(m => m.id === msg.id);
        if (idx !== -1) { const next = [...prev]; next[idx] = msg; return next; }
        return [...prev, msg];
      });
      onDelayedReply();
    },
  });

  const highlightMessage = useCallback((el) => {
    el.classList.remove('animate-highlight-flash');
    void el.offsetWidth;
    el.classList.add('animate-highlight-flash');
  }, []);

  const waitForElement = useCallback((messageId, attempts = 0) => {
    return new Promise((resolve) => {
      const check = () => {
        const el = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
        if (el) return resolve(el);
        if (attempts < thresholds.waitElementMaxFrames) requestAnimationFrame(() => { attempts++; check(); });
        else resolve(null);
      };
      check();
    });
  }, [containerRef, thresholds.waitElementMaxFrames]);

  const jumpToPresent = useCallback(() => {
    setViewingHistory(false);
    resetPagination();
    resetScroll();
    loadInitial().then(() => {
      onJumpToPresent();
      setScrollReady(true);
    });
  }, [resetPagination, resetScroll, loadInitial, onJumpToPresent]);

  const jumpToMessage = useCallback(async (messageId) => {
    const el = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightMessage(el);
      return;
    }
    try {
      const msgs = await apiListMessagesAround(channelId, messageId);
      if (!msgs || msgs.length === 0) return;
      resetPagination();
      setMessages(Array.isArray(msgs) ? msgs : []);
      setViewingHistory(true);
      setHasNewer(true);
      afterCursorRef.current = msgs.length > 0 ? msgs[msgs.length - 1].created_at : null;
      const target = await waitForElement(messageId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightMessage(target);
      }
    } catch {}
  }, [channelId, resetPagination, setMessages, highlightMessage, waitForElement, containerRef]);

  const loadNewer = useCallback(async () => {
    if (loadingNewer || !afterCursorRef.current) return;
    setLoadingNewer(true);
    try {
      const msgs = await apiListMessagesAfter(channelId, afterCursorRef.current);
      if (!msgs || msgs.length === 0) {
        setHasNewer(false);
        setViewingHistory(false);
        setLoadingNewer(false);
        return;
      }
      afterCursorRef.current = msgs[msgs.length - 1].created_at;
      setMessages(prev => {
        const ids = new Set(prev.map(m => m.id));
        const fresh = msgs.filter(m => !ids.has(m.id));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      if (msgs.length < PAGE_SIZE) {
        setHasNewer(false);
        setViewingHistory(false);
      }
    } catch {}
    setLoadingNewer(false);
  }, [channelId, loadingNewer]);

  const onContainerScroll = useCallback(() => {
    handleScroll();
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop < thresholds.loadOlder && hasMore && !loadingMore) {
      const prevHeight = el.scrollHeight;
      loadMore().then(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight - prevHeight;
        });
      });
    }
    if (hasNewer && !loadingNewer && el.scrollHeight - el.scrollTop - el.clientHeight < thresholds.loadNewer) {
      loadNewer();
    }
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (!viewingHistory && distFromBottom > thresholds.viewingHistoryEnter) setViewingHistory(true);
    if (viewingHistory && !hasNewer && distFromBottom < thresholds.viewingHistoryExit) setViewingHistory(false);
  }, [handleScroll, containerRef, hasMore, loadingMore, loadMore, hasNewer, loadingNewer, loadNewer, viewingHistory, thresholds]);

  const sendMessage = useCallback((content, replyTo) => {
    const optimisticColor = resolveOptimisticNameColor({ guildMe, isDM });
    const tempId = '_tmp_' + Math.random().toString(36).slice(2);
    const locallyBlocked = isLimited();
    const replyId = (replyTo && typeof replyTo === 'object') ? replyTo.id : (replyTo || '');
    const replyObj = (replyTo && typeof replyTo === 'object') ? {
      id: replyTo.id,
      user_id: replyTo.user_id,
      username: replyTo.username,
      display_name: replyTo.display_name || '',
      avatar_id: replyTo.avatar_id || '',
      role_color: replyTo.role_color || '',
      content: (replyTo.content || '').slice(0, 100),
      author_perms: replyTo.author_perms || 0,
    } : null;
    setMessages(prev => [...prev, {
      id: tempId,
      _pending: !locallyBlocked,
      _failed: locallyBlocked,
      _ephemeral: locallyBlocked,
      _tempContent: content,
      channel_id: channelId, user_id: user?.id, username: user?.username,
      display_name: user?.display_name || '',
      avatar_id: user?.avatar_id,
      content, created_at: new Date().toISOString(),
      role_color: optimisticColor,
      reply_to: replyId,
      reply: replyObj,
      attachments: [],
    }]);
    onOwnMessageSent();
    if (locallyBlocked) {
      return tempId;
    }
    const status = window.__wsSend?.({
      type: 'message_send',
      payload: { channel_id: channelId, content, reply_to: replyId, message_id: tempId },
    });
    if (status !== 'sent') {
      setTimeout(() => {
        setMessages(prev => {
          if (!prev.find(m => m.id === tempId && m._pending)) return prev;
          return prev.map(m => m.id === tempId ? { ...m, _pending: false, _failed: true, _ephemeral: true } : m);
        });
      }, SEND_OFFLINE_GRACE_MS);
    }
    return tempId;
  }, [channelId, user, guildMe, isDM, onOwnMessageSent, setMessages]);

  return {
    messages, setMessages,
    loading, loadingMore, loadingNewer,
    hasMore, hasNewer, viewingHistory,
    scrollReady,
    containerRef, bottomRef,
    onContainerScroll,
    sendMessage, jumpToMessage, jumpToPresent,
  };
}