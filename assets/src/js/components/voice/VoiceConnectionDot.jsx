import React from 'react';

export default function VoiceConnectionDot({ state }) {
  const { color, pulse } = (() => {
    switch (state) {
      case 'connected':    return { color: 'bg-[var(--accent-success)]', pulse: false };
      case 'connecting':
      case 'new':          return { color: 'bg-yellow-400', pulse: true };
      case 'disconnected':
      case 'failed':       return { color: 'bg-red-500', pulse: true };
      case 'closed':       return { color: 'bg-white/30', pulse: false };
      default:             return { color: 'bg-white/30', pulse: false };
    }
  })();

  return (
    <span className="relative inline-flex w-2 h-2 flex-shrink-0">
      {pulse && (
        <span className={`absolute inset-0 rounded-full ${color} opacity-60 animate-ping`} aria-hidden="true" />
      )}
      <span className={`relative inline-flex w-2 h-2 rounded-full ${color}`} />
    </span>
  );
}