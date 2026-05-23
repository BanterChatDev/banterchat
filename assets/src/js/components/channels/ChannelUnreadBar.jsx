import React from 'react';

export default function ChannelUnreadBar({ visible }) {
  if (!visible) return null;
  return (
    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-white/70 rounded-r-full" />
  );
}