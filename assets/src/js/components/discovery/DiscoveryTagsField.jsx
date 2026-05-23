import React from 'react';
import { MAX_TAGS } from './languages';
import { useT } from '../../hooks/useT';

export default function DiscoveryTagsField({ value, onChange }) {
  const t = useT();
  const tagList = value.split(',').map(tag => tag.trim()).filter(Boolean);
  const tooMany = tagList.length > MAX_TAGS;
  return (
    <div>
      <label className="tw-label mb-1.5">{t('discovery.field_tags_label')}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tw-input w-full px-3 py-2 text-sm"
        placeholder={t('discovery.field_tags_placeholder')}
      />
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[11px] text-white/25">{t('discovery.field_tags_hint_template').replace('{max}', MAX_TAGS)}</p>
        <span className={`text-[11px] ${tooMany ? 'text-red-400/80' : 'text-white/30'}`}>{tagList.length}/{MAX_TAGS}</span>
      </div>
    </div>
  );
}