import React from 'react';
import Tooltip from '../../ui/Tooltip';

const VARIANTS = {
  default: {
    inactive: 'bg-white/[0.06] text-white/75 hover:bg-white/[0.10] hover:text-white',
    active: 'bg-red-500/20 text-red-300 hover:bg-red-500/25',
  },
  accent: {
    inactive: 'bg-white/[0.06] text-white/75 hover:bg-white/[0.10] hover:text-white',
    active: 'bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30',
  },
  danger: {
    inactive: 'bg-red-500/85 text-white hover:bg-red-500',
    active: 'bg-red-500/85 text-white hover:bg-red-500',
  },
};

const SIZE = {
  default: { btn: 'w-10 h-10', icon: 'w-5 h-5' },
  compact: { btn: 'w-8 h-8',   icon: 'w-4 h-4' },
};

export default function ControlButton({
  icon,
  label,
  tooltip,
  active = false,
  variant = 'default',
  compact = false,
  onClick,
  className = '',
  iconClassName = '',
}) {
  const styles = VARIANTS[variant] || VARIANTS.default;
  const stateClass = active ? styles.active : styles.inactive;
  const size = compact ? SIZE.compact : SIZE.default;

  return (
    <Tooltip text={tooltip || label}>
      <button
        onClick={onClick}
        aria-label={tooltip || label}
        className={`${size.btn} rounded-full flex items-center justify-center transition-colors ${stateClass} ${className}`}
      >
        <span className={`${size.icon} flex items-center justify-center ${iconClassName}`}>{icon}</span>
      </button>
    </Tooltip>
  );
}