import React from 'react';
import { useT } from '../../../hooks/useT';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { VoiceIcon, VolumeOffIcon, ScreenShareIcon, DisconnectIcon } from '../../icons';
import ControlButton from './ControlButton';
import MicSplitButton from './MicSplitButton';
import VideoSplitButton from './VideoSplitButton';

export default function VoiceControlBar({ voice, mode = 'full' }) {
  const t = useT();
  const isMobile = useIsMobile();
  const compact = mode === 'compact' || isMobile;
  const showCamScreen = mode === 'full';

  const wrapClass = mode === 'full'
    ? 'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-[var(--bg-tertiary)]/80 backdrop-blur-sm border border-[var(--border-medium)] shadow-lg shadow-black/30'
    : 'flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--bg-tertiary)]/60';

  return (
    <div className={wrapClass}>
      <MicSplitButton
        muted={voice.muted}
        onToggleMute={voice.toggleMute}
        currentDeviceId={voice.micDeviceId}
        onSelectDevice={voice.changeMicDevice}
        compact={compact}
      />
      <ControlButton
        icon={voice.deafened ? <VolumeOffIcon /> : <VoiceIcon />}
        label={voice.deafened ? t('voice.controls.undeafen') : t('voice.controls.deafen')}
        active={voice.deafened}
        compact={compact}
        onClick={voice.toggleDeafen}
      />
      {showCamScreen && (
        <>
          <VideoSplitButton
            on={!!voice.videoOn}
            onToggle={voice.toggleVideo}
            currentDeviceId={voice.cameraDeviceId}
            onSelectDevice={voice.changeCameraDevice}
            compact={compact}
          />
          <ControlButton
            icon={<ScreenShareIcon />}
            label={voice.screenOn ? t('voice.controls.screen_stop') : t('voice.controls.screen_share')}
            variant="accent"
            compact={compact}
            active={!!voice.screenOn}
            onClick={voice.toggleScreen}
          />
        </>
      )}
      <ControlButton
        icon={<DisconnectIcon />}
        label={t('voice.controls.leave')}
        tooltip={t('voice.controls.disconnect')}
        variant="danger"
        compact={compact}
        onClick={voice.leave}
      />
    </div>
  );
}