import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CameraIcon, ScreenShareIcon } from '../icons';
import UserAvatar from '../user/UserAvatar';
import PeerStatusBadge from './PeerStatusBadge';
import { useContextMenu } from '../contextmenu';
import { isPeerSpeaking } from './peerSpeaking';

function VideoTile({ stream, label, isScreen, isSelf, peer, peerForAvatar, speaking, onContextMenu }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
    }
  }, [stream]);

  const videoMirror = isSelf && !isScreen ? 'transform -scale-x-100' : '';
  const ringStyle = speaking
    ? { boxShadow: '0 0 0 2px var(--accent-success), 0 0 18px rgba(var(--accent-success-rgb), 0.25)' }
    : { boxShadow: '0 4px 12px rgba(0,0,0,0.35)' };

  return (
    <div
      onContextMenu={onContextMenu}
      style={ringStyle}
      className="relative bg-[var(--bg-deepest)] rounded-xl overflow-hidden aspect-video flex items-center justify-center w-full transition-shadow border border-[var(--border-default)]"
    >
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={isSelf}
          className={`w-full h-full object-contain bg-black ${videoMirror}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 px-3 w-full max-w-[80%] min-w-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[var(--border-medium)]">
            <UserAvatar username={peerForAvatar?.username || label} userId={peerForAvatar?.user_id} size="xl" />
          </div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)]/85 truncate w-full text-center min-w-0">{label}</span>
        </div>
      )}
      {peer && !isScreen && (
        <div className="absolute top-2 right-2">
          <PeerStatusBadge peer={peer} size="sm" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--bg-deepest)]/85 backdrop-blur-sm text-[11px] font-medium text-[var(--text-primary)]/90 min-w-0 max-w-full border border-[var(--border-default)]">
          {isScreen
            ? <ScreenShareIcon className="w-3 h-3 flex-shrink-0 text-[var(--accent-info)]" />
            : <CameraIcon className="w-3 h-3 flex-shrink-0 text-white/60" />}
          <span className="truncate min-w-0">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function VideoGrid({
  peers, userId, username,
  videoOn, screenOn,
  localCameraStream, localScreenStream,
  remoteVideoStreams,
  speakingByUserId,
  channelId, can,
}) {
  const { openMenu } = useContextMenu();
  const tiles = [];
  const selfLabel = username || '';
  const selfAvatarPeer = { username: selfLabel, user_id: userId };

  tiles.push({
    key: 'self-cam',
    stream: videoOn && localCameraStream ? localCameraStream : null,
    label: selfLabel,
    isSelf: true,
    isScreen: false,
    peerForAvatar: selfAvatarPeer,
  });
  if (screenOn && localScreenStream) {
    tiles.push({
      key: 'self-scr',
      stream: localScreenStream,
      label: selfLabel,
      isSelf: true,
      isScreen: true,
      peerForAvatar: selfAvatarPeer,
    });
  }

  for (const p of peers || []) {
    if (p.user_id === userId) continue;
    tiles.push({
      key: `${p.user_id}:cam`,
      stream: p.video_on ? remoteVideoStreams[`${p.user_id}:cam`] : null,
      label: p.username,
      isSelf: false,
      isScreen: false,
      peer: p,
      peerForAvatar: p,
      speaking: isPeerSpeaking(p, speakingByUserId),
    });
    if (p.screen_on) {
      tiles.push({
        key: `${p.user_id}:scr`,
        stream: remoteVideoStreams[`${p.user_id}:scr`],
        label: p.username,
        isSelf: false,
        isScreen: true,
        peer: p,
        peerForAvatar: p,
      });
    }
  }

  if (tiles.length === 0) return null;

  const onContext = (e, peer) => {
    if (!peer) return;
    e.preventDefault();
    e.stopPropagation();
    openMenu(e, { voicePeer: peer, channelId, can });
  };

  return <ResponsiveTileGrid tiles={tiles} onContext={onContext} />;
}

function ResponsiveTileGrid({ tiles, onContext }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = useMemo(() => {
    const n = tiles.length;
    if (n <= 1 || size.w < 1 || size.h < 1) return 1;
    const aspect = 16 / 9;
    const gap = 8;
    let bestCols = 1;
    let bestArea = 0;
    for (let c = 1; c <= n; c++) {
      const rows = Math.ceil(n / c);
      const tileW = (size.w - gap * (c - 1)) / c;
      const tileH = (size.h - gap * (rows - 1)) / rows;
      const constrainedW = Math.min(tileW, tileH * aspect);
      if (constrainedW <= 0) continue;
      const area = constrainedW * (constrainedW / aspect);
      if (area > bestArea) { bestArea = area; bestCols = c; }
    }
    return bestCols;
  }, [tiles.length, size.w, size.h]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <div
        className="grid gap-2 w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: cols === 1 ? '480px' : '100%',
        }}
      >
        {tiles.map(t => (
          <div key={t.key} className="min-w-0">
            <VideoTile
              stream={t.stream}
              label={t.label}
              isSelf={t.isSelf}
              isScreen={t.isScreen}
              peer={t.peer}
              peerForAvatar={t.peerForAvatar}
              speaking={t.speaking}
              onContextMenu={t.peer ? (e) => onContext(e, t.peer) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}