import React, { useState } from 'react';
import NSFWToggle from './NSFWToggle';
import { useT } from '../../../hooks/useT';

export default function DiscoveryNav({ navigate }) {
  const t = useT();
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate('/search?q=' + encodeURIComponent(q));
  };

  const mainHost = typeof window !== 'undefined'
    ? window.location.hostname.replace(/^guilds\./i, '')
    : '';

  return (
    <header className="discovery-nav">
      <div className="discovery-nav-inner">
        <a
      className="discovery-brand"
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
        >
          <span>Banter</span> {t('discovery.public_nav_brand_suffix')}
        </a>

        <form className="discovery-search" onSubmit={handleSubmit} role="search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('discovery.public_nav_search_placeholder')}
            aria-label={t('discovery.public_nav_search_aria')}
            autoComplete="off"
          />
        </form>

        <a
          className="discovery-back"
          href={mainHost ? `https://${mainHost}` : '/'}
          rel="noopener"
        >
          {t('discovery.public_nav_back_to_banter')}
        </a>

        <NSFWToggle />
      </div>
    </header>
  );
}