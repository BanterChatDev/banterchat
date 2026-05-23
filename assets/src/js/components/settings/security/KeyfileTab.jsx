import React, { useState, useCallback } from 'react';
import { apiGenerateKeyfile, apiRotateKeyfile, apiRemoveKeyfile, apiMe } from '../../../api/auth';
import { downloadKeyfile, readKeyfileAsHex } from '../../../utils/keyfile';
import PasswordInput from '../../ui/PasswordInput';
import FileUploadArea from '../../ui/FileUploadArea';
import Spinner from '../../ui/Spinner';
import Tooltip from '../../ui/Tooltip';
import { useT } from '../../../hooks/useT';

export default function KeyfileTab({ user, setUser }) {
  const t = useT();
  const [pw, setPw] = useState('');
  const [keyfileName, setKeyfileName] = useState('');
  const [keyfileHex, setKeyfileHex] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [mode, setMode] = useState(null); // 'generate' | 'rotate' | 'remove' | null
  const [ackWarning, setAckWarning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await apiMe();
      if (me && setUser) setUser(me);
    } catch {}
  }, [setUser]);

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

  const handleGenerate = async () => {
    if (!pw) { setErr(t('settings_security.password_required')); return; }
    setBusy('generate'); setErr('');
    try {
      const res = await apiGenerateKeyfile(pw);
      downloadKeyfile(res.keyfile, user?.username);
      cancel();
      refresh();
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  };

  const handleRotate = async () => {
    if (!pw) { setErr(t('settings_security.password_required')); return; }
    setBusy('rotate'); setErr('');
    try {
      const res = await apiRotateKeyfile(pw);
      downloadKeyfile(res.keyfile, user?.username);
      cancel();
      refresh();
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  };

  const handleRemove = async () => {
    if (!pw) { setErr(t('settings_security.password_required')); return; }
    if (!keyfileHex) { setErr(t('settings_security.keyfile.current_required')); return; }
    setBusy('remove'); setErr('');
    try {
      await apiRemoveKeyfile(pw, keyfileHex);
      cancel();
      refresh();
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  };

  const cancel = () => {
    setMode(null); setPw(''); setKeyfileHex(''); setKeyfileName(''); setErr('');
    setAckWarning(false);
  };

  const start = (m) => { cancel(); setMode(m); };

  const hasKeyfile = !!user?.has_keyfile;
  const fingerprint = user?.keyfile_fingerprint || '';

  // The "no recovery possible" warning. Shown loudly before Generate so the
  // user understands the trade before opting in. Also shown before Remove
  // (because they're walking away from the protection).
  const warningPanel = (
    <div className="bg-red-500/[0.08] border-2 border-red-500/40 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h4 className="text-[14px] font-bold text-red-400 uppercase tracking-wider">{t('settings_security.keyfile.warning.title')}</h4>
      </div>
      <ul className="text-[12px] text-red-100/80 leading-relaxed space-y-1.5 list-disc pl-5 marker:text-red-400/60">
        <li>{t('settings_security.keyfile.warning.no_email')}</li>
        <li>{t('settings_security.keyfile.warning.no_support')}</li>
        <li>{t('settings_security.keyfile.warning.no_backup')}</li>
        <li>{t('settings_security.keyfile.warning.attacker')}</li>
      </ul>
      <label className="flex items-start gap-2 cursor-pointer pt-1 border-t border-red-500/20">
        <input
          type="checkbox"
          checked={ackWarning}
          onChange={(e) => setAckWarning(e.target.checked)}
          className="mt-0.5 accent-red-500"
        />
        <span className="text-[12px] text-red-100/90 font-medium">{t('settings_security.keyfile.warning.ack')}</span>
      </label>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-[14px] font-semibold text-white/90">{t('settings_security.keyfile.title')}</h3>
          <p className="text-[12px] text-white/40 leading-relaxed mt-1">{t('settings_security.keyfile.explainer')}</p>
        </div>

        <div className="border-t border-white/[0.04] pt-3 text-[12px]">
          <span className="text-white/40">{t('settings_security.keyfile.status')}: </span>
          {hasKeyfile ? (
            <Tooltip text={fingerprint}>
              <span className="text-emerald-400 font-mono">{t('settings_security.keyfile.set')} — {fingerprint.slice(0, 16)}…</span>
            </Tooltip>
          ) : (
            <span className="text-white/30 italic">{t('settings_security.keyfile.not_set')}</span>
          )}
        </div>

        {err && <p className="text-[11px] text-red-400">{err}</p>}

        {/* Default state: list available actions */}
        {mode === null && !hasKeyfile && (
          <button
            type="button"
            onClick={() => start('generate')}
            className="text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg px-3 py-1.5"
          >
            {t('settings_security.keyfile.generate')}
          </button>
        )}

        {mode === null && hasKeyfile && (
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => start('rotate')} className="text-[12px] text-white/80 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg px-3 py-1.5">
              {t('settings_security.keyfile.rotate')}
            </button>
            <button type="button" onClick={() => start('remove')} className="text-[12px] text-red-400/80 bg-red-500/[0.06] hover:bg-red-500/[0.12] rounded-lg px-3 py-1.5">
              {t('settings_security.keyfile.remove')}
            </button>
          </div>
        )}
      </div>

      {/* Generate flow — show LOUD warning + ack checkbox, then password */}
      {mode === 'generate' && (
        <>
          {warningPanel}
          <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5 space-y-2">
            <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('profile.placeholder.current_password')} autoComplete="current-password" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy === 'generate' || !pw || !ackWarning}
                className="text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'generate' ? <Spinner size="xs" /> : t('settings_security.keyfile.generate')}
              </button>
              <button type="button" onClick={cancel} className="text-[12px] text-white/40 hover:text-white/60 px-3 py-1.5">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rotate flow — password only (this is the recovery path for a lost keyfile) */}
      {mode === 'rotate' && (
        <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5 space-y-2">
          <p className="text-[12px] text-white/50 leading-relaxed">{t('settings_security.keyfile.rotate_explainer')}</p>
          <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('profile.placeholder.current_password')} autoComplete="current-password" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              disabled={busy === 'rotate' || !pw}
              className="text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === 'rotate' ? <Spinner size="xs" /> : t('settings_security.keyfile.confirm_rotate')}
            </button>
            <button type="button" onClick={cancel} className="text-[12px] text-white/40 hover:text-white/60 px-3 py-1.5">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Remove flow — needs warning + password + current keyfile (destructive: disables the second factor) */}
      {mode === 'remove' && (
        <>
          {warningPanel}
          <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5 space-y-2">
            <p className="text-[12px] text-white/50 leading-relaxed">{t('settings_security.keyfile.remove_explainer')}</p>
            <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('profile.placeholder.current_password')} autoComplete="current-password" />
            <FileUploadArea
              onFile={onPickKeyfile}
              filename={keyfileName}
              accept=".keyfile,application/octet-stream"
              prompt={t('settings_security.keyfile.current_keyfile_prompt')}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy === 'remove' || !pw || !keyfileHex || !ackWarning}
                className="text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'remove' ? <Spinner size="xs" /> : t('settings_security.keyfile.confirm_remove')}
              </button>
              <button type="button" onClick={cancel} className="text-[12px] text-white/40 hover:text-white/60 px-3 py-1.5">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}