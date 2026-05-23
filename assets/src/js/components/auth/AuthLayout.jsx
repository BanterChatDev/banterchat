import React from 'react';
import Logo from '../ui/Logo';
import { ROUTES } from '../../routes';

function BackgroundPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full text-white/[0.04]"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="auth-grid" width="160" height="160" patternUnits="userSpaceOnUse">
          <rect x="20" y="20" width="120" height="120" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="80" cy="80" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0 0 L160 160 M160 0 L0 160" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="800" height="800" fill="url(#auth-grid)" />
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="relative w-[220px] h-[220px]">
      <div className="absolute left-8 top-8 w-[140px] h-[140px] rounded-[6px] bg-[var(--accent)]" />
      <div className="absolute left-16 top-16 w-[140px] h-[140px] rounded-[6px] bg-[var(--accent)]/60 mix-blend-screen" />
      <div className="absolute left-[72px] top-[72px] w-[68px] h-[68px] rounded-[4px] bg-[var(--bg-deepest)]" />
    </div>
  );
}

export default function AuthLayout({ navigate, children }) {
  return (
    <div className="min-h-screen flex bg-[var(--bg-deepest)]">
      <div className="hidden md:flex flex-1 relative bg-[var(--bg-tertiary)] overflow-hidden items-center justify-center">
        <BackgroundPattern />
        <div className="relative z-10">
          <BrandMark />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-end p-6">
          <a
            href={ROUTES.home}
            onClick={(e) => { e.preventDefault(); navigate(ROUTES.home); }}
            className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors"
          >
            <Logo className="w-6 h-6" />
            <span className="text-sm font-semibold tracking-[0.18em] uppercase">BANTER</span>
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <div className="w-full max-w-[380px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}