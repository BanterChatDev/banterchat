import { useState, useCallback } from 'react';
import { Shell } from '../components/Shell';
import { ToastProvider } from '../components';
import { SettingsView } from './settings/SettingsView';

const api = window.electronAPI;

export function Settings() {
  const [prefs, setPrefs] = useState(null);
  const [info, setInfo] = useState(null);

  const boot = useCallback(() => Promise.all([
    api.settings.get().then(setPrefs),
    api.settings.getInfo().then(setInfo),
  ]), []);

  return (
    <ToastProvider>
      <Shell boot={boot}>
        {prefs && info && <SettingsView prefs={prefs} setPrefs={setPrefs} info={info} />}
      </Shell>
    </ToastProvider>
  );
}