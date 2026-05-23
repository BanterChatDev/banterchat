import React from 'react';
import Tooltip from '../ui/Tooltip';

export default function ActionBtn({ onClick, disabled, title, danger, children }) {
  return (
    <Tooltip text={title}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 flex-shrink-0
          ${danger
            ? 'bg-[var(--bg-tertiary)] hover:bg-red-500/20 text-white/35 hover:text-red-400'
            : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-float)] text-white/40 hover:text-white/80'
          }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}