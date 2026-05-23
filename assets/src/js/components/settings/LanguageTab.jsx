import React from 'react';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import { useT } from '../../hooks/useT';
import { getAllLanguages } from '../../lang';
import { CheckIcon } from '../icons';

export default function LanguageTab() {
  const { setPref, currentLang } = useUIPrefs();
  const t = useT();
  const langs = getAllLanguages();
  const activeId = currentLang?.id || 'en_us';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-1">{t('settings.language.heading')}</h3>
        <p className="text-xs text-white/30">{t('settings.language.description')}</p>
      </div>
      <div className="space-y-1.5">
        {langs.map(lang => {
          const isActive = activeId === lang.id;
          return (
            <button
              key={lang.id}
              onClick={() => setPref('lang_id', lang.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                isActive
                  ? 'border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.05)]'
                  : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
              }`}
            >
              <span className="text-[13px] text-white/80">{lang.name}</span>
              {isActive && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[var(--accent)]">
                  <CheckIcon className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}