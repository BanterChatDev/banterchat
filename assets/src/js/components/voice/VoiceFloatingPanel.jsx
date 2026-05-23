import React, { useEffect, useRef, useMemo } from 'react';
import { useT } from '../../hooks/useT';
import { VolumeIcon } from '../icons';
import VoiceConnectionDot from './VoiceConnectionDot';
import VoiceControlBar from './controls/VoiceControlBar';
import UserAvatar from '../user/UserAvatar';
import FloatingWindow from '../ui/FloatingWindow';

function pickDominantStream(voice) {
  if (!voice) return null;
  const remote = voice.remoteVideoStreams || {};
  const peerName = (id) => voice.peers?.find(p => p.user_id === id)?.username;

  for (const [key, stream] of Object.entries(remote)) {
    if (key.endsWith(':scr')) return { stream, label: peerName(key.split(':')[0]), isLocal: false };
  }
  if (voice.screenOn && voice.localScreenStream) return { stream: voice.localScreenStream, label: 'You', isLocal: true };

  const speakingId = Object.keys(voice.speakingByUserId || {}).find(id => remote[`${id}:cam`]);
  if (speakingId) return { stream: remote[`${speakingId}:cam`], label: peerName(speakingId), isLocal: false };

  for (const [key, stream] of Object.entries(remote)) {
    if (key.endsWith(':cam')) return { stream, label: peerName(key.split(':')[0]), isLocal: false };
  }
  if (voice.videoOn && voice.localCameraStream) return { stream: voice.localCameraStream, label: 'You', isLocal: true };
  return null;
}

export default function VoiceFloatingPanel({ voice, channelName, guildName, onOpenChannel }) {
  const t = useT();
  const videoRef = useRef(null);
  const dominant = useMemo(() => pickDominantStream(voice), [
    voice?.remoteVideoStreams, voice?.localCameraStream, voice?.localScreenStream,
    voice?.videoOn, voice?.screenOn, voice?.peers, voice?.speakingByUserId,
  ]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = dominant?.stream || null;
    return () => { try { if (el) el.srcObject = null; } catch {} };
  }, [dominant?.stream]);

  if (!voice?.channelId) return null;

  const stateLabel = voice.connectionState === 'connected'
    ? t('voice.connection.connected')
    : voice.connectionState === 'failed' || voice.connectionState === 'disconnected'
      ? t('voice.connection.failed')
      : t('voice.connection.connecting');

  const subtitleParts = [channelName, guildName].filter(Boolean);
  const peers = voice.peers || [];

  return (
    <FloatingWindow
      title={stateLabel}
      subtitle={subtitleParts.join(' / ')}
      headerLeft={<VoiceConnectionDot state={voice.connectionState} />}
    >
      {dominant?.stream ? (
        <div onClick={onOpenChannel} className="aspect-video bg-black relative cursor-pointer group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={dominant.isLocal}
            className={`w-full h-full object-contain ${dominant.isLocal ? 'transform -scale-x-100' : ''}`}
          />
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/85 truncate max-w-[60%]">
            {dominant.label || ''}
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <span className="text-white/0 group-hover:text-white text-xs font-semibold transition-colors">
              {t('voice.panel.open_channel')}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenChannel}
          className="w-full px-3 py-3 flex flex-col gap-2 hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <VolumeIcon className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0" />
            <span className="text-[12px] text-[var(--text-primary)]/85 truncate flex-1">
              {t('voice.panel.return')}
            </span>
          </div>
          {peers.length > 0 && (
            <div className="flex flex-wrap gap-1 pl-6">
              {peers.slice(0, 6).map(p => (
                <div key={p.user_id} className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-[var(--border-medium)]">
                  <UserAvatar username={p.username} userId={p.user_id} size="sm" />
                </div>
              ))}
              {peers.length > 6 && (
                <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[10px] text-white/60 ring-1 ring-[var(--border-medium)]">
                  +{peers.length - 6}
                </div>
              )}
            </div>
          )}
        </button>
      )}

      <VoiceControlBar voice={voice} mode="compact" />
    </FloatingWindow>
  );
}