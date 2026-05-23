import React from 'react';
import { CameraIcon, CameraOffIcon } from '../../icons';
import CameraPickerPopover from '../CameraPickerPopover';
import MediaSplitButton from './MediaSplitButton';

export default function VideoSplitButton({ on, onToggle, currentDeviceId, onSelectDevice, compact = false }) {
  return (
    <MediaSplitButton
      on={on}
      onToggle={onToggle}
      onIcon={<CameraIcon />}
      offIcon={<CameraOffIcon />}
      onLabelKey="voice.controls.cam_off"
      offLabelKey="voice.controls.cam_on"
      selectLabelKey="voice.controls.cam_select"
      activeStyle="bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30"
      Popover={CameraPickerPopover}
      currentDeviceId={currentDeviceId}
      onSelectDevice={onSelectDevice}
      compact={compact}
    />
  );
}