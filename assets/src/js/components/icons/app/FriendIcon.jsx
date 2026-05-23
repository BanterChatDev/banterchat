import React from 'react';

export function FriendIcon({ status = 'none', className = 'w-4 h-4' }) {
  if (status === 'outgoing') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <circle cx="9" cy="8" r="4" />
        <path d="M3 21v-1a6 6 0 0 1 6-6h2" />
        <circle cx="18" cy="18" r="3.2" />
        <path d="M18 16.2v1.8l1.2 1.2" />
      </svg>
    );
  }
  if (status === 'friends' || status === 'incoming') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <circle cx="9" cy="8" r="4" />
        <path d="M3 21v-1a6 6 0 0 1 6-6h2.5" />
        <path d="M14.5 17.5l2 2 4-4.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="9" cy="8" r="4" />
      <path d="M3 21v-1a6 6 0 0 1 6-6h2" />
      <path d="M18 14v7M14.5 17.5h7" />
    </svg>
  );
}