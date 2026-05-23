import React from 'react';
import Logo from '../ui/Logo';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';

export default function Navbar({ navigate, user }) {
  const t = useT();
  const go = (path) => (e) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <nav className="absolute top-0 left-0 w-full z-30 px-[clamp(1.5rem,4vw,3rem)]">
      <div className="flex items-center justify-between h-[clamp(3.5rem,6vw,5rem)]">
        <a href={ROUTES.home} onClick={go(ROUTES.home)} className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="text-[clamp(0.85rem,1.1vw,1rem)] font-black tracking-wide text-white uppercase">
            Banter
          </span>
        </a>

        <a
          href={user ? ROUTES.channels : ROUTES.register}
          onClick={go(user ? ROUTES.channels : ROUTES.register)}
          className="text-[clamp(0.75rem,1vw,0.9rem)] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] backdrop-blur-sm border border-white/10 rounded-md px-[clamp(1rem,1.5vw,1.5rem)] py-[clamp(0.4rem,0.6vw,0.6rem)] transition-all duration-200"
        >
          {user ? t('landing.navbar.go_to_app') : t('landing.navbar.get_started')}
        </a>
      </div>
    </nav>
  );
}