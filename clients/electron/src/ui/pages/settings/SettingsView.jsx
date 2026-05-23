import { useState, useCallback, useEffect } from 'react';
import { useT, useLangId, setLanguage, getAvailableLanguages } from '../../lib/i18n';
import { Button, Toggle, Section, Row, Select } from '../../components';
import { ChangePassphraseModal } from './ChangePassphraseModal';

const api = window.electronAPI;

const WINDOW_TOGGLES = [
  ['start_minimized', 'label_start_minimized'],
  ['close_to_tray', 'label_close_to_tray'],
  ['launch_on_login', 'label_launch_on_login'],
];

export function SettingsView({ prefs, setPrefs, info }) {
  const t = useT();
  const langId = useLangId();
  const [showChangePP, setShowChangePP] = useState(false);
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    getAvailableLanguages().then(setLanguages);
  }, []);

  const setPref = useCallback(async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    await api.settings.set({ [key]: value });
  }, [setPrefs]);

  const onLangChange = useCallback(async (id) => {
    await setLanguage(id);
    await api.settings.set({ ui_lang: id });
    setPrefs((p) => ({ ...p, ui_lang: id }));
  }, [setPrefs]);

  const clearSession = useCallback(async () => {
    if (!confirm(t('passphrase.confirm_reset'))) return;
    await api.settings.clearSession();
  }, [t]);

  return (
    <>
      <div className="h-full overflow-y-auto px-8 py-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-[20px] font-semibold text-white mb-1">{t('settings.heading')}</h1>
          <p className="text-[12px] text-app-text-muted mb-7">{t('settings.subheading')}</p>

          <Section title={t('settings.section_account')} desc={t('settings.section_account_desc')}>
            <Row label={t('settings.btn_change_passphrase')}>
              <Button variant="secondary" onClick={() => setShowChangePP(true)}>{t('settings.btn_change_passphrase')}</Button>
            </Row>
            <Row label={t('settings.btn_clear_session')}>
              <Button variant="danger" onClick={clearSession}>{t('settings.btn_clear_session')}</Button>
            </Row>
          </Section>

          <Section title={t('settings.section_language')} desc={t('settings.section_language_desc')}>
            <Row label={t('settings.label_ui_language')}>
              <Select value={langId} onChange={onLangChange} options={languages.map((l) => ({ value: l.id, label: l.name }))} className="w-[200px]" />
            </Row>
          </Section>

          <Section title={t('settings.section_window')}>
            {WINDOW_TOGGLES.map(([key, labelKey]) => (
              <Row key={key} label={t(`settings.${labelKey}`)}>
                <Toggle checked={!!prefs[key]} onChange={(v) => setPref(key, v)} />
              </Row>
            ))}
          </Section>

          <Section title={t('settings.section_about')}>
            <Row label={t('settings.label_version')}>
              <span className="text-[12px] text-app-text-muted font-mono">{info.version || '—'}</span>
            </Row>
            <Row label={t('settings.label_file_path')}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-app-text-muted font-mono max-w-[240px] truncate" title={info.sessionFile}>{info.sessionFile || '—'}</span>
                <Button variant="secondary" onClick={() => api.settings.openSessionFolder()}>{t('settings.label_open_folder')}</Button>
              </div>
            </Row>
          </Section>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => api.settings.close()}>{t('settings.btn_close')}</Button>
          </div>
        </div>
      </div>
      <ChangePassphraseModal open={showChangePP} onClose={() => setShowChangePP(false)} />
    </>
  );
}