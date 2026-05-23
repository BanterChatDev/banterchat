import React, { useState } from 'react';
import { apiChangePassword } from '../../../api/auth';
import { readKeyfileAsHex } from '../../../utils/keyfile';
import { useT } from '../../../hooks/useT';
import PasswordInput from '../../ui/PasswordInput';
import FileUploadArea from '../../ui/FileUploadArea';

export default function PasswordTab({ user }) {
  const t = useT();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [keyfileName, setKeyfileName] = useState('');
  const [keyfileHex, setKeyfileHex] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const hasKeyfile = !!user?.has_keyfile;

  const onPickKeyfile = async (file) => {
    setErr('');
    try {
      const hex = await readKeyfileAsHex(file);
      setKeyfileHex(hex);
      setKeyfileName(file.name);
    } catch (ex) {
      setErr(ex.message);
      setKeyfileHex('');
      setKeyfileName('');
    }
  };

  const save = async () => {
    if (hasKeyfile && !keyfileHex) {
      setErr(t('settings_security.keyfile.current_required'));
      return;
    }
    setSaving(true); setMsg(''); setErr('');
    try {
      const res = await apiChangePassword(oldPw, newPw, hasKeyfile ? keyfileHex : undefined);
      setMsg(res.message || t('profile.password.fallback_success'));
      setOldPw(''); setNewPw(''); setKeyfileHex(''); setKeyfileName('');
    } catch (e) { setErr(e.message || t('profile.password.fallback_error')); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5 space-y-2">
      <h3 className="text-[14px] font-semibold text-white/90 mb-1">{t('profile.section.password')}</h3>
      <PasswordInput value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder={t('profile.placeholder.current_password')} autoComplete="current-password" />
      <PasswordInput value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={t('profile.placeholder.new_password')} autoComplete="new-password" />
      {hasKeyfile && (
        <FileUploadArea
          onFile={onPickKeyfile}
          filename={keyfileName}
          accept=".keyfile,application/octet-stream"
          prompt={t('settings_security.keyfile.current_keyfile_prompt')}
        />
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={saving || !oldPw || !newPw} className="text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg px-3 py-1.5 disabled:opacity-50">
          {saving ? t('common.saving') : t('profile.password.submit')}
        </button>
      </div>
      {msg && <p className="text-[11px] text-[var(--accent-info)]">{msg}</p>}
      {err && <p className="text-[11px] text-red-400">{err}</p>}
    </div>
  );
}