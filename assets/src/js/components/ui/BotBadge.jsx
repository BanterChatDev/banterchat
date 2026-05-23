import React from 'react';

export default function BotBadge({ className = '' }) {
  return (
    <span className={`inline-flex items-center px-1 py-px rounded text-[9px] font-semibold bg-[var(--accent)] text-white leading-none tracking-wide ${className}`}>
      BOT
    </span>
  );
}