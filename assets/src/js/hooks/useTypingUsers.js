import { useState, useEffect } from 'react';
import { on } from '../eventBus';

export function useTypingUsers(channelId) {
  const [typers, setTypers] = useState({});

  useEffect(() => {
    setTypers({});
    const offs = [
      on('typingStart', ({ channel_id, user_id, username }) => {
        if (channel_id !== channelId) return;
        setTypers(prev => prev[user_id] === username ? prev : { ...prev, [user_id]: username });
      }),
      on('typingStop', ({ channel_id, user_id }) => {
        if (channel_id !== channelId) return;
        setTypers(prev => { if (!prev[user_id]) return prev; const n = { ...prev }; delete n[user_id]; return n; });
      }),
    ];
    return () => offs.forEach(fn => fn());
  }, [channelId]);

  return typers;
}