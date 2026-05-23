import React, { useEffect, useRef } from 'react';
import { apiCheckSlug } from '../../api/discovery';
import { CheckIcon, CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function DiscoverySlugField({ guildId, value, onChange, existingSlug, check, onCheck }) {
  const t = useT();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!guildId) return;
    if (existingSlug && value === existingSlug) {
      onCheck({ state: 'ok', reason: '' });
      return;
    }
    if (!value) {
      onCheck({ state: 'idle', reason: '' });
      return;
    }
    onCheck({ state: 'checking', reason: '' });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiCheckSlug(guildId, value);
        if (res.available) onCheck({ state: 'ok', reason: '' });
        else onCheck({ state: 'bad', reason: res.reason || t('discovery.slug_unavailable_fallback') });
      } catch {
        onCheck({ state: 'bad', reason: t('discovery.slug_check_failed') });
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [value, guildId, existingSlug, t]);

  const hint = (() => {
    if (check.state === 'checking') return <span className="text-white/30">{t('discovery.slug_checking')}</span>;
    if (check.state === 'ok' && value) return <span className="text-emerald-400/80 inline-flex items-center gap-1"><CheckIcon className="w-3 h-3" /> {t('discovery.slug_available')}</span>;
    if (check.state === 'bad') return <span className="text-red-400/80 inline-flex items-center gap-1"><CloseIcon className="w-3 h-3" /> {check.reason}</span>;
    return <span className="text-white/20">{t('discovery.slug_default_hint')}</span>;
  })();

  return (
    <div>
      <label className="tw-label mb-1.5">{t('discovery.field_slug_label')}</label>
      <div className="flex items-stretch gap-0">
        <span className="tw-input px-3 py-2 text-sm text-white/30 rounded-r-none border-r-0 flex-shrink-0 pointer-events-none">{t('discovery.field_slug_url_prefix')}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="tw-input flex-1 px-3 py-2 rounded-l-none text-sm font-mono"
          placeholder={t('discovery.field_slug_placeholder')}
          maxLength={32}
        />
      </div>
      <p className="text-[11px] mt-1.5">{hint}</p>
    </div>
  );
}