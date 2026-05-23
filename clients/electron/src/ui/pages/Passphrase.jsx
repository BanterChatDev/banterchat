import { useState } from 'react';
import { useT } from '../lib/i18n';
import { Button, Input, Logo, ToastProvider } from '../components';
import { Shell } from '../components/Shell';

const api = window.electronAPI;

function PassphraseView({ mode }) {
  const t = useT();
  const [pp1, setPp1] = useState('');
  const [pp2, setPp2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const isSetup = mode === 'setup';

  const submit = async () => {
    setErr('');
    if (isSetup) {
      if (pp1.length < 8) return setErr(t('passphrase.err_too_short'));
      if (pp1 !== pp2) return setErr(t('passphrase.err_mismatch'));
    } else if (!pp1) {
      return setErr(t('passphrase.err_empty'));
    }
    setBusy(true);
    const res = await api.submitPassphrase(pp1);
    setBusy(false);
    if (res?.error) setErr(t('passphrase.err_wrong'));
  };

  const reset = async () => {
    if (confirm(t('passphrase.confirm_reset'))) await api.resetSession();
  };

  const onKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        <Logo size={72} className="mb-5" />
        <div className="text-[26px] font-bold tracking-tight mb-1">banterchat</div>
        <div className="text-[11px] text-app-text-muted uppercase tracking-[0.18em] mb-8">
          {t(`passphrase.mode_${isSetup ? 'setup' : 'unlock'}_label`)}
        </div>
        <div className="w-full">
          <p className="text-[13.5px] text-app-text mb-5 text-center leading-relaxed">
            {t(`passphrase.mode_${isSetup ? 'setup' : 'unlock'}_text`)}
          </p>
          <div className="flex flex-col gap-2.5 mb-3">
            <Input size="lg" type="password" value={pp1} onChange={setPp1} onKeyDown={onKey} placeholder={t('passphrase.placeholder_passphrase')} autoFocus />
            {isSetup && <Input size="lg" type="password" value={pp2} onChange={setPp2} onKeyDown={onKey} placeholder={t('passphrase.placeholder_confirm')} />}
          </div>
          <div className="text-[12px] text-app-danger min-h-[16px] mb-3 text-center">{err}</div>
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={submit} disabled={busy} className="w-full">
              {t(isSetup ? 'passphrase.btn_set' : 'passphrase.btn_unlock')}
            </Button>
            {!isSetup && <Button size="lg" variant="secondary" onClick={reset} className="w-full">{t('passphrase.btn_reset')}</Button>}
          </div>
          <p className="text-[11px] text-app-text-dim mt-6 text-center leading-relaxed px-2">
            {t(isSetup ? 'passphrase.hint_setup' : 'passphrase.hint_unlock')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Passphrase() {
  const [mode, setMode] = useState('unlock');
  return (
    <ToastProvider>
      <Shell boot={() => api.getMode().then(setMode)}>
        <PassphraseView mode={mode} />
      </Shell>
    </ToastProvider>
  );
}