import React from 'react';
import { OnlineIcon, DndIcon, OfflineIcon } from '../icons/status';

const sizes = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
};

const ICONS = {
  online: OnlineIcon,
  dnd:    DndIcon,
  offline: OfflineIcon,
};

const COLORS = {
  online:  'text-emerald-500',
  dnd:     'text-red-500',
  offline: 'text-zinc-500',
};

export function resolveStatus(status, online) {
  if (status === 'invisible' || status === 'offline') return 'offline';
  if (ICONS[status]) return status;
  return online ? 'online' : 'offline';
}

export default function Status({ online, status, size = 'sm', className = '' }) {
  const effective = resolveStatus(status, online);
  const Icon = ICONS[effective];
  const sizeClass = sizes[size] || sizes.sm;
  const colorClass = COLORS[effective];
  return <Icon className={`${sizeClass} ${colorClass} ${className}`} />;
}

export function AvatarWithStatus({ children, online, status, size = 'xs' }) {
  return (
    <span className="relative inline-flex flex-shrink-0">
      {children}
      <span className="absolute right-0 bottom-0 leading-none">
        <Status online={online} status={status} size={size} />
      </span>
    </span>
  );
}