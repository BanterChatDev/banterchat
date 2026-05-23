import React from 'react';
import { useAccessibilityPrefs } from '../../hooks/useAccessibilityPrefs';
import { useT } from '../../hooks/useT';
import Slider from '../ui/Slider';

function ToggleRow({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-white/90">{label}</div>
        <div className="text-[12px] text-white/45 mt-0.5 leading-snug">{description}</div>
      </div>
      <div className="flex-shrink-0 mt-1">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-150 ${checked ? 'bg-[var(--accent)]' : 'bg-white/[0.12]'}`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 mt-0.5 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
    </label>
  );
}

function SliderRow({ value, onChange, min, max, step, label, description, formatValue }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-white/90">{label}</div>
          <div className="text-[12px] text-white/45 mt-0.5 leading-snug">{description}</div>
        </div>
        <div className="text-[12px] text-white/70 tabular-nums flex-shrink-0">{formatValue ? formatValue(value) : value}</div>
      </div>
      <Slider value={value} onChange={onChange} min={min} max={max} step={step} ariaLabel={label} trackClassName="w-full" />
    </div>
  );
}

export default function AccessibilityTab() {
  const t = useT();
  const { prefs, setPref } = useAccessibilityPrefs();
  const scale = typeof prefs.largerTextScale === 'number' ? prefs.largerTextScale : 1;
  return (
    <div className="max-w-2xl">
      <h2 className="text-[18px] font-bold text-white/90 mb-1">{t('settings_accessibility.heading')}</h2>
      <p className="text-[13px] text-white/45 mb-6">{t('settings_accessibility.description')}</p>
      <div className="divide-y divide-white/[0.06]">
        <SliderRow
          value={scale}
          onChange={(v) => setPref('largerTextScale', v)}
          min={1}
          max={1.5}
          step={0.05}
          label={t('settings_accessibility.larger_text_label')}
          description={t('settings_accessibility.larger_text_description')}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <ToggleRow
          checked={prefs.highContrast}
          onChange={(v) => setPref('highContrast', v)}
          label={t('settings_accessibility.high_contrast_label')}
          description={t('settings_accessibility.high_contrast_description')}
        />
        <ToggleRow
          checked={prefs.invertColors}
          onChange={(v) => setPref('invertColors', v)}
          label={t('settings_accessibility.invert_colors_label')}
          description={t('settings_accessibility.invert_colors_description')}
        />
      </div>
    </div>
  );
}