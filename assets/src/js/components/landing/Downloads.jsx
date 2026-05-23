import React, { useEffect, useRef } from 'react';
import Card from '../ui/Card';
import { DownloadIcon, WindowsIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Navbar from './Navbar';
import Footer from './Footer';

const WINDOWS_INSTALLER = '/downloads/banterchatclientv0.1.0.exe';

export default function Downloads({ navigate, user }) {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e1a] text-white relative select-none">
      <Navbar navigate={navigate} user={user} />
      <main ref={ref} className="relative flex-1 flex flex-col overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--accent)]/10 blur-[120px]" />
          <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-[var(--accent)]/5 blur-[140px]" />
        </div>

        <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-[clamp(1.5rem,4vw,3rem)] pt-[clamp(6rem,10vw,8rem)] pb-[clamp(3rem,5vw,5rem)]">
          <div className="w-full max-w-md mx-auto text-center">
            <h1 data-animate className="opacity-0 text-[clamp(2rem,4.5vw,3.5rem)] font-black leading-tight tracking-tight text-white mb-[clamp(0.75rem,1.5vw,1rem)]">
              {t('landing.downloads.heading')}
            </h1>
            <p data-animate className="opacity-0 text-[clamp(0.95rem,1.3vw,1.1rem)] text-white/65 mb-[clamp(2rem,3.5vw,3rem)] leading-relaxed">
              {t('landing.downloads.subheading')}
            </p>

            <div data-animate className="opacity-0">
              <Card
                bannerFallback={{ background: 'linear-gradient(135deg, #0078d4 0%, #50e6ff 100%)' }}
                avatar={
                  <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <WindowsIcon className="w-7 h-7 text-white" />
                  </div>
                }
                title={t('landing.downloads.windows_title')}
                subtitle={t('landing.downloads.windows_subtitle')}
                size="lg"
                className="text-left"
              >
                <a
                  href={WINDOWS_INSTALLER}
                  download
                  className="flex items-center justify-center gap-2 w-full text-[14px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl px-4 py-3 transition-all duration-200"
                >
                  <DownloadIcon className="w-4 h-4" />
                  {t('landing.downloads.windows_cta')}
                </a>
                <p className="text-[10px] text-white/40 text-center mt-1">
                  {t('landing.downloads.windows_note')}
                </p>
              </Card>
            </div>

            <p data-animate className="opacity-0 mt-[clamp(2rem,3vw,2.5rem)] text-[11px] text-white/35">
              {t('landing.downloads.more_platforms')}
            </p>
          </div>
        </section>
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}