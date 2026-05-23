import React from 'react';
import { MAX_BIO } from './languages';
import { useT } from '../../hooks/useT';

export default function DiscoveryBioField({ value, onChange }) {
  const t = useT();
  const over = value.length > MAX_BIO;
  return (
    <div>
      <label className="tw-label mb-1.5">{t('discovery.field_bio_label')}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="tw-input w-full px-3 py-2 text-sm resize-none"
        placeholder={t('discovery.field_bio_placeholder')}
      />
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[11px] text-white/25">{t('discovery.field_bio_hint')}</p>
        <span className={`text-[11px] ${over ? 'text-red-400/80' : 'text-white/30'}`}>{value.length}/{MAX_BIO}</span>
      </div>
    </div>
  );
}