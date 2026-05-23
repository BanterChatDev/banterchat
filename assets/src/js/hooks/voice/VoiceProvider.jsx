import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLiveKit as useVoice } from '../useLiveKit';
import { on } from '../../eventBus';
import { apiGetVoiceStates } from '../../api/channels';

const VoiceContext = createContext(null);

export function VoiceProvider({ user, children }) {
  const voice = useVoice();
  const [serverPeers, setServerPeers] = useState({});

  useEffect(() => {
    const fetchStates = () => {
      apiGetVoiceStates().then(states => {
        if (states && typeof states === 'object') setServerPeers(states);
      }).catch(() => {});
    };
    fetchStates();
    const unsubReconnect = on('reconnect', fetchStates);
    const unsubPeers = on('voicePeers', (data) => {
      if (!data || !data.channel_id) return;
      setServerPeers(prev => {
        const peers = data.peers || [];
        if (peers.length === 0) {
          if (!(data.channel_id in prev)) return prev;
          const next = { ...prev };
          delete next[data.channel_id];
          return next;
        }
        return { ...prev, [data.channel_id]: peers };
      });
    });
    return () => { unsubPeers(); unsubReconnect(); };
  }, []);

  const voicePeers = useMemo(() => {
    const out = {};
    const all = new Set(Object.keys(serverPeers));
    if (voice.channelId) all.add(voice.channelId);

    for (const ch of all) {
      const serverList = serverPeers[ch] || [];
      if (ch !== voice.channelId) {
        out[ch] = serverList;
        continue;
      }
      const map = new Map();
      for (const p of serverList) map.set(p.user_id, p);
      if (user?.id) {
        map.set(user.id, {
          user_id: user.id,
          username: user.username,
          muted: voice.muted,
          deafened: voice.deafened,
          force_muted: false,
          video_on: voice.videoOn,
          screen_on: voice.screenOn,
        });
      }
      for (const lp of voice.peers || []) map.set(lp.user_id, lp);
      out[ch] = Array.from(map.values()).sort((a, b) => a.user_id.localeCompare(b.user_id));
    }
    return out;
  }, [serverPeers, voice.channelId, voice.peers, voice.muted, voice.deafened, voice.videoOn, voice.screenOn, user?.id, user?.username]);

  if (typeof window !== 'undefined') window.__voiceState = voice;

  const ctx = useMemo(
    () => ({ voice, voicePeers, voiceSpeakingByUserId: voice.speakingByUserId || {} }),
    [voice, voicePeers]
  );
  return <VoiceContext.Provider value={ctx}>{children}</VoiceContext.Provider>;
}

export function useVoiceCtx() {
  const ctx = useContext(VoiceContext);
  return ctx ? ctx.voice : null;
}

export function useVoicePeers() {
  const ctx = useContext(VoiceContext);
  return ctx ? ctx.voicePeers : {};
}

export function useVoiceSpeakingMap() {
  const ctx = useContext(VoiceContext);
  return ctx ? ctx.voiceSpeakingByUserId : {};
}