import React, { useEffect, useRef } from 'react';
import Logo from '../ui/Logo';
import { DownloadIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';

export default function Hero({ navigate, user }) {
  const t = useT();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    el.querySelectorAll('[data-animate]').forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  const goApp = (e) => {
    e.preventDefault();
    navigate(user ? ROUTES.channels : ROUTES.register);
  };

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col bg-[#0a0e1a] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--accent)]/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-[var(--accent)]/5 blur-[140px]" />
      </div>

      <div className="flex-1 flex items-center justify-center px-[clamp(1.5rem,4vw,3rem)] py-[clamp(4rem,8vw,6rem)] relative z-10">
        <div className="w-full max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-[clamp(2.5rem,5vw,4rem)] items-center">

          <div className="text-center lg:text-left">
            <div data-animate className="opacity-0 mb-[clamp(1.5rem,3vw,2rem)] flex justify-center lg:justify-start">
              <Logo className="w-[clamp(4rem,8vw,6rem)] h-[clamp(4rem,8vw,6rem)]" />
            </div>

            <h1 data-animate className="opacity-0 text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.95] tracking-tight text-white mb-[clamp(1rem,2vw,1.5rem)]">
              Banter
            </h1>

            <p data-animate className="opacity-0 text-[clamp(1rem,1.6vw,1.35rem)] text-white/70 mt-[clamp(0.75rem,1.5vw,1.25rem)] font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('landing.hero.tagline')}
            </p>

            <div data-animate className="opacity-0 mt-[clamp(2rem,4vw,3rem)] flex items-center justify-center lg:justify-start gap-3">
              <a
                href={user ? ROUTES.channels : ROUTES.register}
                onClick={goApp}
                className="text-[clamp(0.9rem,1.1vw,1rem)] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md px-[clamp(1.5rem,2vw,2rem)] py-[clamp(0.6rem,0.9vw,0.9rem)] transition-all duration-200"
              >
                {user ? t('landing.hero.open_app') : t('landing.hero.get_started')}
              </a>

              {!user && (
                <a
                  href={ROUTES.login}
                  onClick={(e) => { e.preventDefault(); navigate(ROUTES.login); }}
                  className="text-[clamp(0.9rem,1.1vw,1rem)] font-semibold text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-md px-[clamp(1.5rem,2vw,2rem)] py-[clamp(0.6rem,0.9vw,0.9rem)] transition-all duration-200"
                >
                  {t('landing.hero.sign_in')}
                </a>
              )}

              <a
                href={ROUTES.downloads}
                onClick={(e) => { e.preventDefault(); navigate(ROUTES.downloads); }}
                className="flex items-center gap-2 text-[clamp(0.9rem,1.1vw,1rem)] font-semibold text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-md px-[clamp(1.5rem,2vw,2rem)] py-[clamp(0.6rem,0.9vw,0.9rem)] transition-all duration-200"
              >
                <DownloadIcon className="w-4 h-4" />
                {t('landing.hero.download')}
              </a>
            </div>
          </div>

          <aside data-animate className="opacity-0 relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-[clamp(1.5rem,2.5vw,2rem)]">
            <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />
            <h2 className="text-[clamp(0.7rem,0.85vw,0.8rem)] font-bold tracking-[0.15em] uppercase text-[var(--accent)] mb-[clamp(0.75rem,1.2vw,1rem)]">
              {t('landing.hero.about_heading')}
            </h2>
            <p className="text-[clamp(0.85rem,1vw,0.95rem)] text-white/75 leading-[1.7]">
              {t('landing.hero.about_body')}
            </p>
          </aside>

        </div>
      </div>
    </section>
  );
}