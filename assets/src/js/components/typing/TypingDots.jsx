import React from 'react';

const SIZES = {
  sm: 'w-1 h-1 bg-[rgb(var(--content-base)/0.3)]',
  md: 'w-1.5 h-1.5 bg-[rgb(var(--content-base)/0.4)]',
};

export default function TypingDots({ label, size = 'sm' }) {
  const dot = SIZES[size] || SIZES.sm;
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={`${dot} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
      <span className={`${dot} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
      <span className={`${dot} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
      {label && <span className="text-[9px] text-[rgb(var(--content-base)/0.2)] ml-0.5">{label}</span>}
    </span>
  );
}