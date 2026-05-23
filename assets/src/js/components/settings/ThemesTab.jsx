import React from 'react';
import { useUIPrefs } from '../../hooks/useUIPrefs';
import { useT } from '../../hooks/useT';
import ThemePicker from '../theme/ThemePicker';

export default function ThemesTab() {
  const { setPref, currentTheme } = useUIPrefs();
  const t = useT();

  return (
    <ThemePicker
      activeTheme={currentTheme?.id || 'dark'}
      onSelect={(themeId) => setPref('theme_id', themeId)}
      title={t('settings_themes.title')}
      description={t('settings_themes.description')}
    />
  );
}