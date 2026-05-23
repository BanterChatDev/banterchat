import React from 'react';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';

const FOOTER_LINKS = [
  { key: 'tos', href: ROUTES.tos, spa: true },
  { key: 'privacy', href: ROUTES.privacy, spa: true },
  { key: 'guidelines', href: ROUTES.guidelines, spa: true },
  { key: 'content_policy', href: ROUTES.contentPolicy, spa: true },
  { key: 'appeal', href: '/appeal', spa: false },
];

export default function Footer({ navigate }) {
  const t = useT();
  const linkClass = "text-[clamp(0.7rem,0.8vw,0.8rem)] text-white/55 hover:text-white transition-colors";
  const dotClass = "text-white/20 text-[10px]";

  const onClick = (e, link) => {
    if (!link.spa || !navigate) return;
    e.preventDefault();
    navigate(link.href);
  };

  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0e1a]">
      <div className="w-full max-w-screen-xl mx-auto px-[clamp(1.5rem,4vw,3rem)] py-5 flex items-center justify-center gap-3 flex-wrap">
        <span className="text-[clamp(0.7rem,0.8vw,0.8rem)] text-white/45">
          {t('landing.footer.copyright')}
        </span>
        {FOOTER_LINKS.map((link, i) => (
          <React.Fragment key={link.key}>
            <span className={dotClass}>·</span>
            <a href={link.href} onClick={(e) => onClick(e, link)} className={linkClass}>
              {t(`landing.footer.${link.key}`)}
            </a>
          </React.Fragment>
        ))}
      </div>
    </footer>
  );
}