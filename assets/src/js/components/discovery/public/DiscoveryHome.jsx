import React, { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import { useNSFWOptIn } from './NSFWToggle';
import { useT } from '../../../hooks/useT';

export default function DiscoveryHome({ navigate }) {
  const t = useT();
  const nsfw = useNSFWOptIn();
  const [listings, setListings] = useState(null);
  const [topTags, setTopTags] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setListings(null);
    setError('');
    fetch('/api/public/listings/recent')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setListings(data.listings || []);
        setTopTags(data.top_tags || []);
      })
      .catch(() => { if (!cancelled) setError(t('discovery.public_home_fail_load')); });
    return () => { cancelled = true; };
  }, [nsfw, t]);

  return (
    <div>
<div className="discovery-hero">
        <h1>{t('discovery.public_home_hero_title')}</h1>
        <p>{t('discovery.public_home_hero_subtitle')}</p>
      </div>

      {topTags.length > 0 && (
        <>
          <div className="discovery-section-head"><h2>{t('discovery.public_home_popular_tags')}</h2></div>
          <div className="discovery-tag-cloud">
            {topTags.map(tag => (
              <a
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                onClick={(e) => { e.preventDefault(); navigate(`/tag/${encodeURIComponent(tag)}`); }}
              >
                #{tag}
              </a>
            ))}
          </div>
        </>
      )}

      <div className="discovery-section-head">
        <h2>{t('discovery.public_home_recently_bumped')}</h2>
        <span className="discovery-section-count">{t('discovery.public_home_listings_count_template').replace('{n}', (listings || []).length)}</span>
      </div>

      {error && <p className="discovery-error">{error}</p>}
      {listings === null && !error && <div className="discovery-loading">{t('ui.infinite_list_loading')}</div>}
      {listings !== null && listings.length === 0 && !error && (
        <div className="discovery-empty">
          <h2>{t('discovery.public_home_empty_title')}</h2>
          <p>{t('discovery.public_home_empty_body')}</p>
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