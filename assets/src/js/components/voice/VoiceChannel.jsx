import React from 'react';
import { VolumeIcon } from '../icons';
import VoiceControls from './controls';
import VoiceConnectionDot from './VoiceConnectionDot';
import VideoGrid from './VideoGrid';
import Spinner from '../ui/Spinner';
import { useT } from '../../hooks/useT';
import { useGuildMe } from '../../hooks/useGuildMe';
import { PERM_ADMINISTRATOR } from '../../permissions';

function PulseRings() {
  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-[var(--accent-success)]/10 animate-ping" style={{ animationDuration: '2.6s' }} />
      <span className="absolute inset-2 rounded-full bg-[var(--accent-success)]/15 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.4s' }} />
      <span className="absolute inset-4 rounded-full bg-[var(--accent-success)]/20 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.8s' }} />
      <div className="relative w-20 h-20 rounded-full bg-[var(--bg-tertiary)] border border-white/[0.08] flex items-center justify-center shadow-lg shadow-black/30">
        <VolumeIcon className="w-9 h-9 text-[var(--accent-success)]" />
      </div>
    </div>
  );
}

export default function VoiceChannel({ channelId, channel, user, voice }) {
  const t = useT();
  const {
    peers, muted, deafened, connecting, connectionState,
    join, leave,
    videoOn, screenOn,
    localCameraStream, localScreenStream, remoteVideoStreams,
    speakingByUserId,
  } = voice;
  const isConnected = voice.channelId === channelId;
  const guildId = channel?.guild_id || null;
  const { can } = useGuildMe(guildId, user?.id);
  const isConnecting = isConnected && (connecting || (connectionState && connectionState !== 'connected'));

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 relative bg-gradient-to-b from-[var(--bg-base)] to-[var(--bg-deepest)]">
        <div className="hidden lg:flex h-12 items-center px-4 border-b border-white/[0.06] flex-shrink-0 bg-[var(--bg-base)]/80 backdrop-blur-sm">
          <VolumeIcon className="w-4 h-4 text-white/30 mr-2" />
          <span className="text-[13px] font-semibold text-white/85 truncate">{channel?.name || t('voice.channel_fallback')}</span>
          {channel?.description && (
            <>
              <span className="mx-2.5 w-px h-3.5 bg-white/[0.08] flex-shrink-0" />
              <span className="text-[11px] text-white/30 truncate">{channel.description}</span>
            </>
          )}
          {isConnected && !isConnecting && (
            <div className="ml-auto flex items-center gap-1.5">
              <VoiceConnectionDot state={connectionState} />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pb-24 relative">
          {!isConnected ? (
            <div className="text-center space-y-6 max-w-sm">
              <PulseRings />
              <div>
                <p className="text-white/90 text-lg font-semibold">{channel?.name || t('voice.channel_fallback_long')}</p>
                <p className="text-white/40 text-xs mt-2">{t('voice.empty_hint')}</p>
              </div>
              <button
                onClick={() => join(channelId, channel?.guild_id || null)}
                disabled={connecting}
                className="px-8 py-2.5 bg-[var(--accent-success)] hover:brightness-110 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent-success)]/20"
              >
                {connecting ? t('voice.connecting') : t('voice.join')}
              </button>
            </div>
          ) : isConnecting ? (
            <div className="text-center space-y-5">
              <div className="flex items-center justify-center"><Spinner size="md" /></div>
              <p className="text-white/80 text-sm font-semibold">{t('voice.connecting_long')}</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center relative">
              <VideoGrid
                peers={peers}
                userId={user?.id}
                username={user?.username}
                videoOn={videoOn}
                screenOn={screenOn}
                localCameraStream={localCameraStream}
                localScreenStream={localScreenStream}
                remoteVideoStreams={remoteVideoStreams}
                speakingByUserId={speakingByUserId}
                channelId={channelId}
                can={can}
              />
            </div>
          )}
        </div>

        {isConnected && !isConnecting && (
          <div className="absolute left-0 right-0 bottom-0 flex justify-center pb-3 sm:pb-5 px-2 pointer-events-none" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="pointer-events-auto max-w-full">
              <VoiceControls {...voice} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}