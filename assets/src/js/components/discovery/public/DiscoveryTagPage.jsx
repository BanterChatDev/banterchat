import React, { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import { useNSFWOptIn } from './NSFWToggle';
import { useT } from '../../../hooks/useT';

export default function DiscoveryTagPage({ tag, navigate }) {
  const t = useT();
  const nsfw = useNSFWOptIn();
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tag) {
      setListings([]);
      return;
    }
    let cancelled = false;
    setListings(null);
    setError('');
    fetch(`/api/public/listings/tag/${encodeURIComponent(tag)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setListings(data.listings || []);
      })
      .catch(() => { if (!cancelled) setError(t('discovery.public_tag_fail_load')); });
    return () => { cancelled = true; };
  }, [tag, nsfw, t]);

  return (
    <div>
<h1 className="discovery-page-title">#{tag}</h1>
      <p className="discovery-page-subtitle">
        {listings === null ? t('ui.infinite_list_loading') : (listings.length === 1 ? t('discovery.public_tag_listing_one_template') : t('discovery.public_tag_listing_other_template')).replace('{n}', listings.length)}
      </p>
      {error && <p className="discovery-error">{error}</p>}
      {listings !== null && listings.length === 0 && !error && (
        <div className="discovery-empty">
          <p>{t('discovery.public_tag_empty_template').replace('{tag}', tag)}</p>
          <p>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
              className="discovery-accent"
            >
              {t('discovery.public_browse_all_arrow')}
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