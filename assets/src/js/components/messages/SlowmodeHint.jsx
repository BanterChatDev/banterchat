import React from 'react';
import { ClockIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

function formatDuration(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r === 0 ? `${m}m` : `${m}m ${r}s`;
  }
  const h = Math.floor(s / 3600);
  const r = Math.floor((s % 3600) / 60);
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

export default function SlowmodeHint({ seconds, immune = false, compact = false }) {
  const t = useT();
  if (!seconds || seconds <= 0) return null;
  const dur = formatDuration(seconds);
  if (compact) {
    const tip = immune
      ? t('messages.input_slowmode_hint_immune').replace('{duration}', dur)
      : t('messages.input_slowmode_hint').replace('{duration}', dur);
    return (
      <Tooltip text={tip}>
        <div className="flex items-center gap-1 px-1.5 mr-1 text-white/30" aria-label={tip}>
          <ClockIcon className="w-3.5 h-3.5" />
          <span className="text-[11px] tabular-nums">{dur}</span>
        </div>
      </Tooltip>
    );
  }
  const text = immune
    ? t('messages.input_slowmode_hint_immune').replace('{duration}', dur)
    : t('messages.input_slowmode_hint').replace('{duration}', dur);
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-white/30 px-1 mb-1.5">
      <ClockIcon className="w-3 h-3" />
      <span>{text}</span>
    </div>
  );
}