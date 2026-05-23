import { useMediaDevices } from './useMediaDevices';

const MIC_CONSTRAINTS = { audio: true };

export function useMicDevices() {
  return useMediaDevices('audioinput', 'microphone', MIC_CONSTRAINTS);
}