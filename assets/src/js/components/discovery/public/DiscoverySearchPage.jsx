import React, { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import { useNSFWOptIn } from './NSFWToggle';
import { useT } from '../../../hooks/useT';

export default function DiscoverySearchPage({ navigate, search }) {
  const t = useT();
  const nsfw = useNSFWOptIn();
  const query = (new URLSearchParams(search || '').get('q') || '').trim();
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query) {
      setListings([]);
      return;
    }
    let cancelled = false;
    setListings(null);
    setError('');
    fetch(`/api/public/listings/search?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setListings(data.listings || []);
      })
      .catch(() => { if (!cancelled) setError(t('discovery.public_search_failed')); });
    return () => { cancelled = true; };
  }, [query, nsfw, t]);

  return (
    <div>
<h1 className="discovery-page-title">
        {t('discovery.public_search_title_prefix')}<span className="discovery-accent">"{query}"</span>
      </h1>
      <p className="discovery-page-subtitle">
        {listings === null ? t('discovery.public_search_searching') : (listings.length === 1 ? t('discovery.public_search_result_one_template') : t('discovery.public_search_result_other_template')).replace('{n}', listings.length)}
      </p>
      {error && <p className="discovery-error">{error}</p>}
      {listings !== null && listings.length === 0 && !error && query && (
        <div className="discovery-empty">
          <p>{t('discovery.public_search_no_match_template').replace('{q}', query)}</p>
          <p>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
              className="discovery-accent"
            >
              {t('discovery.public_browse_all')}
            </a>
          </p>
        </div>
      )}
      {listings !== null && listings.length > 0 && (
        <div className="discovery-grid">
          {listings.map(l => <ListingCard key={l.slug} listing={l} />)}
        </div>
      )}
    </div>
  );
}