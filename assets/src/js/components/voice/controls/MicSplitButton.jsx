import React from 'react';
import { MicOnIcon, MicOffIcon } from '../../icons';
import MicPickerPopover from '../MicPickerPopover';
import MediaSplitButton from './MediaSplitButton';

export default function MicSplitButton({ muted, onToggleMute, currentDeviceId, onSelectDevice, compact = false }) {
  return (
    <MediaSplitButton
      on={muted}
      onToggle={onToggleMute}
      onIcon={<MicOffIcon />}
      offIcon={<MicOnIcon />}
      onLabelKey="voice.controls.unmute"
      offLabelKey="voice.controls.mute"
      selectLabelKey="voice.controls.mic_select"
      activeStyle="bg-red-500/20 text-red-300 hover:bg-red-500/25"
      Popover={MicPickerPopover}
      currentDeviceId={currentDeviceId}
      onSelectDevice={onSelectDevice}
      compact={compact}
    />
  );
}