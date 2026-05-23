import { useState, useRef, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track, TrackEvent, ConnectionState, VideoPresets } from 'livekit-client';
import { request } from '../api/client';
import { r } from '../api/routes';

function mapParticipant(p) {
  return {
    user_id: p.identity,
    username: p.name || p.identity,
    muted: !p.isMicrophoneEnabled,
    deafened: false,
    force_muted: false,
    video_on: p.isCameraEnabled,
    screen_on: p.isScreenShareEnabled,
  };
}

function mapConnectionState(state) {
  switch (state) {
    case ConnectionState.Disconnected: return 'disconnected';
    case ConnectionState.Connecting:   return 'connecting';
    case ConnectionState.Connected:    return 'connected';
    case ConnectionState.Reconnecting: return 'connecting';
    default: return 'new';
  }
}

const ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  publishDefaults: {
    simulcast: true,
    videoCodec: 'vp8',
    videoEncoding: VideoPresets.h720.encoding,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    screenShareEncoding: VideoPresets.h1080.encoding,
    screenShareSimulcastLayers: [VideoPresets.h360, VideoPresets.h720],
  },
};

export function useLiveKit() {
  const [channelId, setChannelId] = useState(null);
  const [channelGuildId, setChannelGuildId] = useState(null);
  const [peers, setPeers] = useState([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  const [speakingByUserId, setSpeakingByUserId] = useState({});
  const [videoOn, setVideoOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [micDeviceId, setMicDeviceId] = useState('');
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState({});

  const roomRef = useRef(null);
  const audioElsRef = useRef([]);
  const deafenedRef = useRef(false);
  useEffect(() => { deafenedRef.current = deafened; }, [deafened]);

  const refreshPeers = useCallback((room) => {
    if (!room) return;
    const list = Array.from(room.remoteParticipants.values()).map(mapParticipant);
    setPeers(list);
  }, []);

  const prevCamTrackRef = useRef(null);
  const prevScrTrackRef = useRef(null);

  const syncLocalState = useCallback((room) => {
    if (!room) return;
    const lp = room.localParticipant;
    setMuted(!lp.isMicrophoneEnabled);
    setVideoOn(lp.isCameraEnabled);
    setScreenOn(lp.isScreenShareEnabled);

    const camPub = lp.getTrackPublication(Track.Source.Camera);
    const camMST = camPub?.track?.mediaStreamTrack || null;
    if (camMST !== prevCamTrackRef.current) {
      prevCamTrackRef.current = camMST;
      setLocalCameraStream(camMST ? new MediaStream([camMST]) : null);
    }

    const scrPub = lp.getTrackPublication(Track.Source.ScreenShare);
    const scrMST = scrPub?.track?.mediaStreamTrack || null;
    if (scrMST !== prevScrTrackRef.current) {
      prevScrTrackRef.current = scrMST;
      setLocalScreenStream(scrMST ? new MediaStream([scrMST]) : null);
    }
  }, []);

  const cleanup = useCallback(() => {
    audioElsRef.current.forEach(el => { try { el.remove(); } catch {} });
    audioElsRef.current = [];
    setRemoteVideoStreams({});
    setLocalCameraStream(null);
    setLocalScreenStream(null);
    setVideoOn(false);
    setScreenOn(false);
    setMuted(false);
    setSpeaking(false);
    setSpeakingByUserId({});
    setPeers([]);
    setChannelId(null);
    setChannelGuildId(null);
    setConnectionState('new');
  }, []);

  const wireRoom = useCallback((room) => {
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      setConnectionState(mapConnectionState(state));
      if (state === ConnectionState.Connected) setConnecting(false);
    });
    room.on(RoomEvent.ParticipantConnected, () => refreshPeers(room));
    room.on(RoomEvent.ParticipantDisconnected, () => refreshPeers(room));
    room.on(RoomEvent.TrackMuted, (_pub, participant) => {
      if (participant === room.localParticipant) syncLocalState(room);
      refreshPeers(room);
    });
    room.on(RoomEvent.TrackUnmuted, (_pub, participant) => {
      if (participant === room.localParticipant) syncLocalState(room);
      refreshPeers(room);
    });
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.muted = deafenedRef.current;
        el.autoplay = true;
        el.setAttribute('playsinline', '');
        document.body.appendChild(el);
        audioElsRef.current.push(el);
      } else if (track.kind === Track.Kind.Video) {
        const k = track.source === Track.Source.ScreenShare ? 'scr' : 'cam';
        setRemoteVideoStreams(prev => ({
          ...prev,
          [`${participant.identity}:${k}`]: new MediaStream([track.mediaStreamTrack]),
        }));
      }
      refreshPeers(room);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach(el => {
          try { el.remove(); } catch {}
          const i = audioElsRef.current.indexOf(el);
          if (i >= 0) audioElsRef.current.splice(i, 1);
        });
      } else if (track.kind === Track.Kind.Video) {
        const k = track.source === Track.Source.ScreenShare ? 'scr' : 'cam';
        const key = `${participant.identity}:${k}`;
        setRemoteVideoStreams(prev => {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      refreshPeers(room);
    });
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const map = {};
      const myId = room.localParticipant?.identity;
      let me = false;
      speakers.forEach(s => { map[s.identity] = true; if (s.identity === myId) me = true; });
      setSpeakingByUserId(map);
      setSpeaking(me);
    });
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      const t = publication?.track;
      if (!t) { syncLocalState(room); return; }
      const onRestarted = () => syncLocalState(room);
      t.on(TrackEvent.Restarted, onRestarted);
      t.on(TrackEvent.Unmuted, onRestarted);
      syncLocalState(room);
    });
    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      const src = publication?.source;
      if (src === Track.Source.Camera) setLocalCameraStream(null);
      else if (src === Track.Source.ScreenShare) setLocalScreenStream(null);
      syncLocalState(room);
    });
  }, [refreshPeers, syncLocalState]);

  const join = useCallback(async (chId, guildId) => {
    if (!chId) return;
    if (roomRef.current) {
      try { await roomRef.current.disconnect(); } catch {}
      roomRef.current = null;
    }
    setConnecting(true);
    setChannelId(chId);
    setChannelGuildId(guildId || null);
    let token, url;
    try {
      const j = await request('POST', r.voice.token(), { channel_id: chId });
      token = j.token;
      url = j.url;
    } catch {
      setConnecting(false);
      cleanup();
      return;
    }
    const room = new Room(ROOM_OPTIONS);
    wireRoom(room);
    roomRef.current = room;
    try {
      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      try { await room.startAudio(); } catch {}
      const onInteract = () => { room.startAudio().catch(() => {}); };
      document.addEventListener('click', onInteract, { once: true, capture: true });
      document.addEventListener('touchend', onInteract, { once: true, capture: true });
      syncLocalState(room);
      refreshPeers(room);
    } catch {
      setConnecting(false);
      try { await room.disconnect(); } catch {}
      roomRef.current = null;
      cleanup();
    }
  }, [wireRoom, cleanup, refreshPeers, syncLocalState]);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) { try { await room.disconnect(); } catch {} }
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const lp = room.localParticipant;
    try { await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled); } catch {}
  }, []);

  const toggleDeafen = useCallback(() => {
    const next = !deafened;
    setDeafened(next);
    audioElsRef.current.forEach(el => { try { el.muted = next; } catch {} });
  }, [deafened]);

  const toggleVideo = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const lp = room.localParticipant;
    try { await lp.setCameraEnabled(!lp.isCameraEnabled); } catch {}
  }, []);

  const toggleScreen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const lp = room.localParticipant;
    try { await lp.setScreenShareEnabled(!lp.isScreenShareEnabled); } catch {}
  }, []);

  const changeMicDevice = useCallback(async (deviceId) => {
    setMicDeviceId(deviceId);
    const room = roomRef.current;
    if (!room) return;
    try { await room.switchActiveDevice('audioinput', deviceId); } catch {}
  }, []);

  const changeCameraDevice = useCallback(async (deviceId) => {
    setCameraDeviceId(deviceId);
    const room = roomRef.current;
    if (!room) return;
    try { await room.switchActiveDevice('videoinput', deviceId); } catch {}
  }, []);

  return {
    channelId, channelGuildId, peers, muted, deafened, connecting, speaking,
    connectionState, speakingByUserId,
    micDeviceId, cameraDeviceId,
    videoOn, screenOn,
    localCameraStream, localScreenStream, remoteVideoStreams,
    join, leave, toggleMute, toggleDeafen,
    changeMicDevice, changeCameraDevice,
    toggleVideo, toggleScreen,
  };
}