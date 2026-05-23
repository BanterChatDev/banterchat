import React from 'react';
import VoiceControlBar from './VoiceControlBar';

export default function VoiceControls(voice) {
  return <VoiceControlBar voice={voice} mode="full" />;
}