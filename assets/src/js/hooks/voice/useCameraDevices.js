import { useMediaDevices } from './useMediaDevices';

const CAMERA_CONSTRAINTS = { video: true };

export function useCameraDevices() {
  return useMediaDevices('videoinput', 'camera', CAMERA_CONSTRAINTS);
}