import React from 'react';
import { LockIcon, ClockIcon } from '../icons';
import LiveTimer from '../markdown/LiveTimer';

function formatCountdown(targetUnix) {
  const remaining = Math.max(0, Math.ceil(targetUnix - Date.now() / 1000));
  if (remaining < 60) return `${remaining}s`;
  const m = Math.floor(remaining / 60);
  const r = remaining % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

export default function InputStateBar({
  variant = 'locked',
  message,
  countdownUntilUnix = 0,
  action,
}) {
  const Icon = variant === 'slowmode' ? ClockIcon : LockIcon;
  return (
    <div className="px-3 sm:px-4 pb-4 pt-1 flex-shrink-0">
      <div className="relative flex items-center bg-[var(--bg-float)] rounded-lg px-4 py-2.5 cursor-not-allowed">
        <div className="absolute inset-0 bg-black/20 rounded-lg pointer-events-none" />
        <Icon className="w-5 h-5 text-white/30 shrink-0 mr-3 relative z-10" />
        <span className="flex-1 text-[13px] text-white/30 select-none relative z-10">{message}</span>
        {variant === 'slowmode' && countdownUntilUnix > 0 && (
          <LiveTimer
            unix={countdownUntilUnix}
            formatter={formatCountdown}
            intervalMs={250}
            bare
            className="relative z-10 ml-3 text-[12px] font-mono tabular-nums text-white/50"
          />
        )}
        {action && <div className="relative z-10 ml-3">{action}</div>}
      </div>
    </div>
  );
}   