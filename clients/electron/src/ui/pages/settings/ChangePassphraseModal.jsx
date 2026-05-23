import { useState } from 'react';
import { useT } from '../../lib/i18n';
import { Button, Input, Modal, useToast } from '../../components';

const api = window.electronAPI;

export function ChangePassphraseModal({ open, onClose }) {
  const t = useT();
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [nx, setNx] = useState('');
  const [conf, setConf] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setCur(''); setNx(''); setConf(''); setErr(''); setBusy(false); };

  const save = async () => {
    setErr('');
    if (nx.length < 8) return setErr(t('passphrase.err_too_short'));
    if (nx !== conf) return setErr(t('passphrase.err_mismatch'));
    setBusy(true);
    const res = await api.settings.changePassphrase(cur, nx);
    setBusy(false);
    if (res?.error === 'invalid') return setErr(t('settings.change_pp_err_current_wrong'));
    if (res?.ok) {
      toast.push({ kind: 'success', message: t('settings.change_pp_ok') });
      reset();
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('settings.btn_change_passphrase')}>
      <div className="flex flex-col gap-2 mb-3">
        <Input type="password" value={cur} onChange={setCur} placeholder={t('settings.change_pp_current')} />
        <Input type="password" value={nx} onChange={setNx} placeholder={t('settings.change_pp_new')} />
        <Input type="password" value={conf} onChange={setConf} placeholder={t('settings.change_pp_confirm')} />
      </div>
      {err && <p className="text-[11px] text-app-danger mb-2">{err}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>{t('settings.btn_close')}</Button>
        <Button onClick={save} disabled={busy || !cur || !nx || !conf}>{t('settings.change_pp_btn_save')}</Button>
      </div>
    </Modal>
  );
}