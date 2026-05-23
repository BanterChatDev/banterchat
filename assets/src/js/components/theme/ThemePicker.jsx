import React from 'react';
import { getDefaultThemes, getColorThemes, getThemeById } from '../../themes';
import { CheckIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

function ThemeSwatch({ theme, isActive, onSelect }) {
  const vars = theme.auto ? getThemeById('dark')?.vars : theme.vars;
  const v = vars || {};
  const bgBase = v.bg_base || '#1f2125';
  const bgSecondary = v.bg_secondary || '#1a1c20';
  const bgTertiary = v.bg_tertiary || '#14161a';
  const accent = v.accent || '#5865f2';
  const textPrimary = v.text_primary || '#e8e6e3';
  const lightVars = theme.auto ? getThemeById('light')?.vars : null;
  return (
    <Tooltip text={theme.name}>
      <button
        type="button"
        onClick={onSelect}
        aria-label={theme.name}
        className="flex flex-col items-center gap-2 group"
      >
        <div className={`relative w-[120px] h-[80px] rounded-lg overflow-hidden transition-all duration-150 group-hover:scale-[1.03] ${
          isActive
            ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)]'
            : 'ring-1 ring-white/[0.08] group-hover:ring-white/20'
        }`}>
          {theme.auto && lightVars ? (
            <>
              <div className="absolute inset-0" style={{ backgroundColor: lightVars.bg_base }} />
              <div className="absolute inset-0" style={{ backgroundColor: bgBase, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
              <div className="absolute left-2 top-2 w-3 h-3 rounded-full" style={{ backgroundColor: lightVars.accent || '#5865f2' }} />
              <div className="absolute right-2 bottom-2 w-3 h-3 rounded-full" style={{ backgroundColor: accent }} />
            </>
          ) : (
            <>
              <div className="absolute inset-0" style={{ backgroundColor: bgBase }} />
              <div className="absolute left-0 top-0 bottom-0 w-[28px]" style={{ backgroundColor: bgTertiary }} />
              <div className="absolute left-[28px] top-0 bottom-0 w-[32px]" style={{ backgroundColor: bgSecondary }} />
              <div className="absolute left-[34px] top-2 w-3 h-1 rounded-sm" style={{ backgroundColor: textPrimary, opacity: 0.45 }} />
              <div className="absolute left-[34px] top-[18px] w-4 h-1 rounded-sm" style={{ backgroundColor: textPrimary, opacity: 0.3 }} />
              <div className="absolute left-[34px] top-[30px] w-3 h-1 rounded-sm" style={{ backgroundColor: textPrimary, opacity: 0.3 }} />
              <div className="absolute left-[68px] top-2 right-2 h-2 rounded-sm" style={{ backgroundColor: textPrimary, opacity: 0.3 }} />
              <div className="absolute left-[68px] top-[18px] w-[30px] h-2 rounded-sm" style={{ backgroundColor: textPrimary, opacity: 0.2 }} />
              <div className="absolute left-[68px] top-[30px] w-[26px] h-2 rounded-sm" style={{ backgroundColor: textPrimary, opacity: 0.2 }} />
              <div className="absolute left-[68px] bottom-2 w-[18px] h-3 rounded" style={{ backgroundColor: accent }} />
              <div className="absolute left-2 top-2 w-3 h-3 rounded-full" style={{ backgroundColor: accent, opacity: 0.7 }} />
            </>
          )}
          {isActive && (
            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-md ring-2 ring-[var(--bg-base)]">
              <CheckIcon className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <span className={`text-[12px] font-medium transition-colors ${
          isActive ? 'text-white' : 'text-white/60 group-hover:text-white/85'
        }`}>{theme.name}</span>
      </button>
    </Tooltip>
  );
}

function Section({ label, themes, activeTheme, onSelect }) {
  if (!themes || themes.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-4">{label}</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-x-4 gap-y-5">
        {themes.map(theme => (
          <ThemeSwatch
            key={theme.id}
            theme={theme}
            isActive={activeTheme === theme.id}
            onSelect={() => onSelect(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ThemePicker({
  activeTheme = 'dark',
  onSelect,
  title,
  description,
}) {
  const t = useT();
  const defaults = getDefaultThemes();
  const colors = getColorThemes();
  const titleResolved = title ?? t('settings_themes.title');
  const descriptionResolved = description ?? t('settings_themes.description');

  return (
    <div className="space-y-6">
      {(titleResolved || descriptionResolved) && (
        <div>
          {titleResolved && <h3 className="text-sm font-semibold text-white/80 mb-1">{titleResolved}</h3>}
          {descriptionResolved && <p className="text-xs text-white/30">{descriptionResolved}</p>}
        </div>
      )}
      <Section label={t('settings_themes.section_default')} themes={defaults} activeTheme={activeTheme} onSelect={onSelect} />
      <Section label={t('settings_themes.section_color')} themes={colors} activeTheme={activeTheme} onSelect={onSelect} />
    </div>
  );
}