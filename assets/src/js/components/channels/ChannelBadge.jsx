import React from 'react';

export default function ChannelBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}