import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import { apiForgotPassword } from '../../api/auth';
import { readKeyfileAsHex } from '../../utils/keyfile';
import PasswordStrength from './PasswordStrength';
import PasswordInput from '../ui/PasswordInput';
import FileUploadArea from '../ui/FileUploadArea';
import Spinner from '../ui/Spinner';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';

export default function ForgotPassword({ navigate }) {
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keyfileName, setKeyfileName] = useState('');
  const [keyfileHex, setKeyfileHex] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const onPickKeyfile = async (file) => {
    setError('');
    try {
      const hex = await readKeyfileAsHex(file);
      setKeyfileHex(hex);
      setKeyfileName(file.name);
    } catch (err) {
      setError(err.message);
      setKeyfileHex('');
      setKeyfileName('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!keyfileHex) { setError(t('auth.forgot.keyfile_required')); return; }
    setLoading(true);
    try {
      const res = await apiForgotPassword(username, keyfileHex, password);
      setMessage(res.message || t('auth.forgot.default_response'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout navigate={navigate}>
      <h1 className="mb-1 text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
        {t('auth.title.forgot')}
      </h1>
      <p className="mb-8 text-sm text-white/35">{t('auth.subtitle.forgot')}</p>

      {message && (
        <div className="mb-5 rounded-lg border border-[rgb(var(--accent-info-rgb)/0.2)] bg-[rgb(var(--accent-info-rgb)/0.1)] px-4 py-3">
          <p className="text-sm text-[var(--accent-info)]">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-white/60">{t('auth.label.username')}</label>
          <div className={`relative rounded-md transition-all ${focused === 'user' ? 'ring-1 ring-[var(--accent)]' : ''}`}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocused('user')}
              onBlur={() => setFocused(null)}
              className="w-full rounded-md border border-white/[0.06] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-white placeholder-white/20 transition-colors focus:border-white/[0.12] focus:outline-none"
              placeholder={t('auth.placeholder.username_login')}
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-white/60">{t('auth.label.keyfile')}</label>
          <FileUploadArea
            onFile={onPickKeyfile}
            filename={keyfileName}
            accept=".keyfile,application/octet-stream"
            prompt={t('auth.forgot.choose_keyfile')}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-white/60">{t('auth.label.new_password')}</label>
          <PasswordInput
            variant="auth"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.placeholder.min_8_chars')}
            required
            autoComplete="new-password"
          />
          <PasswordStrength password={password} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (<><Spinner size="md" />{t('auth.button.forgot_sending')}</>) : t('auth.button.forgot_send')}
        </button>
      </form>

      <p className="mt-8 text-sm text-white/30">
        {t('auth.link.remembered_it')}{' '}
        <a
          href={ROUTES.login}
          onClick={(e) => { e.preventDefault(); navigate(ROUTES.login); }}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          {t('auth.link.back_to_login')}
        </a>
      </p>
    </AuthLayout>
  );
}