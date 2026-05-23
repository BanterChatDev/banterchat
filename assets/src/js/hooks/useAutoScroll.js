import { useRef, useCallback, useEffect } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';

const VIEWING_HISTORY_PX = 1500;
const VIEWING_HISTORY_EXIT_PX = 300;
const LOAD_OLDER_PX = 100;
const LOAD_NEWER_PX = 200;
const POST_SEND_SCROLL_DELAY_MS = 50;
const WAIT_ELEMENT_MAX_FRAMES = 10;

export function useAutoScroll() {
  const stick = useStickToBottom({ initial: 'instant', resize: 'smooth' });
  const containerRef = stick.scrollRef;
  const bottomRef = stick.contentRef;
  const isAtBottomRef = useRef(true);
  const locked = useRef(false);
  const savedTop = useRef(null);
  const pendingScroll = useRef(false);
  const settling = useRef(false);

  useEffect(() => {
    isAtBottomRef.current = stick.isAtBottom;
  }, [stick.isAtBottom]);

  const nearBottom = isAtBottomRef;

  const recomputeNearBottom = useCallback(() => {
    return stick.isAtBottom;
  }, [stick.isAtBottom]);

  const flushScroll = useCallback(() => {
    stick.scrollToBottom('instant');
  }, [stick]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (document.hidden) { pendingScroll.current = true; return; }
    pendingScroll.current = false;
    stick.scrollToBottom(behavior === 'smooth' ? 'smooth' : 'instant');
  }, [stick]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && pendingScroll.current) {
        pendingScroll.current = false;
        requestAnimationFrame(() => stick.scrollToBottom('instant'));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [stick]);

  const handleScroll = useCallback(() => {}, []);

  const reset = useCallback(() => {
    locked.current = false;
    savedTop.current = null;
    settling.current = true;
  }, []);

  const onInitialLoad = useCallback(() => {
    requestAnimationFrame(() => {
      stick.scrollToBottom('instant');
      requestAnimationFrame(() => stick.scrollToBottom('instant'));
      setTimeout(() => {
        if (settling.current) {
          stick.scrollToBottom('instant');
          settling.current = false;
        }
      }, 300);
    });
  }, [stick]);

  const onOwnMessageSent = useCallback(() => {
    requestAnimationFrame(() => {
      stick.scrollToBottom('instant');
    });
  }, [stick]);

  const onOwnMessageConfirmed = useCallback(() => {
    if (stick.isAtBottom) {
      requestAnimationFrame(() => {
        stick.scrollToBottom('instant');
      });
    }
  }, [stick]);

  const onPeerMessage = useCallback(() => {}, []);

  const onDelayedReply = useCallback(() => {
    if (!stick.isAtBottom) return;
    setTimeout(() => {
      if (stick.isAtBottom) stick.scrollToBottom('smooth');
    }, POST_SEND_SCROLL_DELAY_MS);
  }, [stick]);

  const onReconnectReplay = useCallback(() => {
    if (stick.isAtBottom) {
      requestAnimationFrame(() => {
        stick.scrollToBottom('instant');
      });
    }
  }, [stick]);

  const onJumpToPresent = useCallback(() => {
    requestAnimationFrame(() => {
      stick.scrollToBottom('instant');
    });
  }, [stick]);

  useEffect(() => {
    const onLock = () => { locked.current = true; };
    const onUnlock = () => { requestAnimationFrame(() => { locked.current = false; }); };
    const onSave = () => {
      if (stick.scrollRef.current) savedTop.current = stick.scrollRef.current.scrollTop;
      locked.current = true;
    };
    const onRestore = () => {
      requestAnimationFrame(() => {
        if (stick.scrollRef.current && savedTop.current !== null) {
          stick.scrollRef.current.scrollTop = savedTop.current;
        }
        savedTop.current = null;
        locked.current = false;
      });
    };
    window.addEventListener('scrollLock', onLock);
    window.addEventListener('scrollUnlock', onUnlock);
    window.addEventListener('scrollSave', onSave);
    window.addEventListener('scrollRestore', onRestore);
    return () => {
      window.removeEventListener('scrollLock', onLock);
      window.removeEventListener('scrollUnlock', onUnlock);
      window.removeEventListener('scrollSave', onSave);
      window.removeEventListener('scrollRestore', onRestore);
    };
  }, [stick]);

  return {
    containerRef, bottomRef,
    nearBottom, recomputeNearBottom,
    handleScroll, reset,
    onInitialLoad, onOwnMessageSent, onOwnMessageConfirmed, onPeerMessage, onDelayedReply, onReconnectReplay, onJumpToPresent,
    thresholds: {
      loadOlder: LOAD_OLDER_PX,
      loadNewer: LOAD_NEWER_PX,
      viewingHistoryEnter: VIEWING_HISTORY_PX,
      viewingHistoryExit: VIEWING_HISTORY_EXIT_PX,
      waitElementMaxFrames: WAIT_ELEMENT_MAX_FRAMES,
    },
  };
}