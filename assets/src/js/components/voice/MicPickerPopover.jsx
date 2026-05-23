import React from 'react';
import MediaPickerPopover from './MediaPickerPopover';
import { useMicDevices } from '../../hooks/voice/useMicDevices';

export default function MicPickerPopover(props) {
  return <MediaPickerPopover {...props} langPrefix="voice.mic_picker" useDevices={useMicDevices} />;
}