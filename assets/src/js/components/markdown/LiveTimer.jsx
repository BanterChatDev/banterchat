import React, { useState, useEffect } from 'react';
import Tooltip from '../ui/Tooltip';

function relTime(unix) {
  const diff = unix - Math.floor(Date.now() / 1000);
  const abs = Math.abs(diff);
  const ago = diff < 0;
  if (abs < 1) return ago ? 'done' : 'now';
  if (abs < 60) return ago ? abs + 's ago' : 'in ' + abs + 's';
  const m = Math.floor(abs / 60);
  if (abs < 3600) return ago ? m + ' min ago' : 'in ' + m + ' min';
  const h = Math.floor(abs / 3600);
  if (abs < 86400) {
    const rm = Math.floor((abs % 3600) / 60);
    const label = rm > 0 ? h + 'h ' + rm + 'm' : h + 'h';
    return ago ? label + ' ago' : 'in ' + label;
  }
  const d = Math.floor(abs / 86400);
  return ago ? d + 'd ago' : 'in ' + d + 'd';
}

const FMT = {
  R: relTime,
  t: u => new Date(u * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  T: u => new Date(u * 1000).toLocaleTimeString(),
  d: u => new Date(u * 1000).toLocaleDateString(),
  D: u => new Date(u * 1000).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
  f: u => new Date(u * 1000).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  F: u => new Date(u * 1000).toLocaleString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
};

export default function LiveTimer({ unix, format, formatter, bare = false, intervalMs, className }) {
  const fn = formatter || FMT[format] || relTime;
  const tick = intervalMs || (format === 'R' || formatter ? 1000 : 6000);
  const [text, setText] = useState(() => fn(unix));
  useEffect(() => {
    setText(fn(unix));
    const id = setInterval(() => setText(fn(unix)), tick);
    return () => clearInterval(id);
  }, [unix, format, fn, tick]);
  if (bare) {
    return <span className={className}>{text}</span>;
  }
  return (
    <Tooltip text={FMT.F(unix)}>
      <span className="inline-flex items-center bg-[var(--bg-float)] text-white/75 rounded px-1 py-[1px] text-[12px] font-mono cursor-default">
        {text}
      </span>
    </Tooltip>
  );
}