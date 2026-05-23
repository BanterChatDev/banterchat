import React from 'react';
import { MAX_MESSAGE_LENGTH } from '../../config';

const SHOW_THRESHOLD = 100;

export default function CharCount({ length }) {
  const remaining = MAX_MESSAGE_LENGTH - length;
  if (remaining > SHOW_THRESHOLD) return null;
  const color = remaining < 0 ? 'text-red-400' : remaining <= 25 ? 'text-yellow-400/80' : 'text-white/40';
  return <span className={`text-[11px] tabular-nums select-none px-1 ${color}`}>{remaining}</span>;
}