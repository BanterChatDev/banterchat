import React from 'react';
import BotBadge from '../ui/BotBadge';
import { NEUTRAL_NAME_COLOR } from '../../utils/userColor';
import { t as tBare } from '../../lang/apply';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
    const [y, m, day] = ts.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return tBare('user.info.today_at') + formatTime(ts);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) return tBare('user.info.yesterday_at') + formatTime(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + tBare('user.info.at_separator') + formatTime(ts);
}

export default function UserInfo({ username, displayName, timestamp, compact, onUsernameClick, onUsernameContext, nameColor, isBot, isWebhook, children }) {
  if (compact) {
    return <span className="text-[10px] text-white/30 cursor-default select-none opacity-0 group-hover:opacity-100 transition-opacity duration-100">{formatTime(timestamp)}</span>;
  }
  const primary = (displayName && displayName.trim()) || username || (isWebhook ? 'Webhook' : '');
  const showHandle = !isWebhook && displayName && displayName.trim() && displayName.trim() !== username;
  const interactive = !isWebhook && (onUsernameClick || onUsernameContext);
  return (
    <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
      <span
        className={`text-[13px] font-semibold ${interactive ? 'hover:underline cursor-pointer' : 'cursor-default select-none'}`}
        style={{ color: nameColor || NEUTRAL_NAME_COLOR }}
        onClick={interactive ? (e) => onUsernameClick && onUsernameClick(e) : undefined}
        onContextMenu={interactive ? (e) => onUsernameContext && onUsernameContext(e) : undefined}
      >
        {primary}
      </span>
      {showHandle && <span className="text-[11px] text-white/30 cursor-default select-none">@{username}</span>}
      {(isBot || isWebhook) && <BotBadge />}
      {children}
      <span className="text-[10px] text-white/35 cursor-default select-none">{formatDate(timestamp)}</span>
    </div>
  );
}

export { formatTime, formatDate };