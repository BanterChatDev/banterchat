import React from 'react';
import MediaPickerPopover from './MediaPickerPopover';
import { useCameraDevices } from '../../hooks/voice/useCameraDevices';

export default function CameraPickerPopover(props) {
  return <MediaPickerPopover {...props} langPrefix="voice.cam_picker" useDevices={useCameraDevices} />;
}