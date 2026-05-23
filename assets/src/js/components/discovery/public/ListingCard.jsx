import React from 'react';
import { useT } from '../../../hooks/useT';

function initials(name) {
  const parts = (name || '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function ListingCard({ listing }) {
  const t = useT();
  const href = '/' + listing.slug;
  return (
    <a href={href} className="discovery-card">
      {listing.nsfw && <span className="discovery-card-nsfw">18+</span>}
      <div
        className="discovery-card-banner"
        style={listing.banner_url ? { backgroundImage: `url('${listing.banner_url}')` } : undefined}
      />
      <div className="discovery-card-body">
        <div className="discovery-card-icon">
          {listing.icon_url
            ? <img src={listing.icon_url} alt="" loading="lazy" />
            : <span>{initials(listing.name)}</span>}
        </div>
        <h3 className="discovery-card-title">{listing.name}</h3>
        <p className="discovery-card-bio">{listing.bio}</p>
        <div className="discovery-card-tags">
          {(listing.tags || []).slice(0, 5).map(t => (
            <span key={t} className="discovery-tag">{t}</span>
          ))}
        </div>
        <div className="discovery-card-meta">
          <span>{t('discovery.public_card_members_template').replace('{n}', listing.member_count)}</span>
          <span>·</span>
          <span>{t('discovery.public_card_bumped_template').replace('{ago}', listing.bumped_ago)}</span>
        </div>
      </div>
    </a>
  );
}