import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import PasswordStrength from './PasswordStrength';
import PasswordInput from '../ui/PasswordInput';
import FileUploadArea from '../ui/FileUploadArea';
import Spinner from '../ui/Spinner';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';
import { readKeyfileAsHex } from '../../utils/keyfile';

function safeContinue() {
  if (typeof window === 'undefined') return ROUTES.channels;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('continue');
  if (!raw) return ROUTES.channels;
  if (!raw.startsWith('/') || raw.startsWith('//')) return ROUTES.channels;
  return raw;
}

export default function AuthForm({ mode, onSubmit, onVerifyKeyfile, navigate }) {
  const t = useT();
  const isLogin = mode === 'login';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [blockInfo, setBlockInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [needsKeyfile, setNeedsKeyfile] = useState(false);
  const [keyfileUsername, setKeyfileUsername] = useState('');

  const finishLogin = () => {
    const dest = safeContinue();
    if (dest.startsWith('/invite/')) {
      window.location.href = dest;
    } else {
      navigate(dest);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(username, password);
      finishLogin();
    } catch (err) {
      if (err?.requiresKeyfile) {
        setKeyfileUsername(err.username || username);
        setNeedsKeyfile(true);
        setError('');
        setBlockInfo(null);
      } else if (err?.data?.kind === 'banned' || err?.data?.kind === 'suspended') {
        setBlockInfo(err.data);
        setError('');
      } else {
        setError(err.message);
        setBlockInfo(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyfile = async (file) => {
    setError('');
    try {
      const hex = await readKeyfileAsHex(file);
      await onVerifyKeyfile(keyfileUsername, hex);
      finishLogin();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatTs = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <AuthLayout navigate={navigate}>
      <h1 className="text-[28px] font-semibold text-[var(--text-primary)] mb-1 tracking-tight">
        {isLogin ? t('auth.title.login') : t('auth.title.register')}
      </h1>
      <p className="text-sm text-white/35 mb-8">
        {isLogin ? t('auth.subtitle.login') : t('auth.subtitle.register')}
      </p>

      {blockInfo && (
        <div className="bg-red-500/[0.08] border border-red-500/30 rounded-lg p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-[15px] font-semibold text-red-400">
              {blockInfo.kind === 'banned' ? t('auth.block.banned_title') : t('auth.block.suspended_title')}
            </h2>
          </div>
          {blockInfo.reason && (
            <div className="mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">{t('auth.block.reason_label')}</div>
              <p className="text-[13px] text-white/85 leading-snug whitespace-pre-wrap break-words">{blockInfo.reason}</p>
            </div>
          )}
          {blockInfo.banned_by_username && (
            <div className="mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">{t('auth.block.by_label')}</div>
              <p className="text-[13px] text-white/70">{blockInfo.banned_by_username}</p>
            </div>
          )}
          {blockInfo.created_at && (
            <div className="mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">{t('auth.block.when_label')}</div>
              <p className="text-[13px] text-white/70">{formatTs(blockInfo.created_at)}</p>
            </div>
          )}
          {blockInfo.until && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">{t('auth.block.until_label')}</div>
              <p className="text-[13px] text-white/70">{formatTs(blockInfo.until)}</p>
            </div>
          )}
        </div>
      )}

      {error && !blockInfo && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {needsKeyfile ? (
        <div className="space-y-4">
          <p className="text-sm text-white/60">{t('auth.keyfile.new_device_prompt')}</p>
          <FileUploadArea
            onFile={handleKeyfile}
            accept=".keyfile,application/octet-stream"
            prompt={t('auth.keyfile.choose_file')}
          />
          <button
            type="button"
            onClick={() => { setNeedsKeyfile(false); setKeyfileUsername(''); setError(''); }}
            className="text-[12px] text-white/40 hover:text-white/70"
          >
            {t('auth.keyfile.back_to_login')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-white/60 mb-1.5">{t('auth.label.username')}</label>
            <div className={`relative rounded-md transition-all ${focused === 'user' ? 'ring-1 ring-[var(--accent)]' : ''}`}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocused('user')}
                onBlur={() => setFocused(null)}
                className="w-full bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
                placeholder={isLogin ? t('auth.placeholder.username_login') : t('auth.placeholder.username_register')}
                required
                autoComplete="username"
              />
            </div>
            {!isLogin && <p className="text-[11px] text-white/25 mt-1">{t('auth.hint.username_length')}</p>}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-white/60 mb-1.5">{t('auth.label.password')}</label>
            <PasswordInput
              variant="auth"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? t('auth.placeholder.password_login') : t('auth.placeholder.min_8_chars')}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {!isLogin && <PasswordStrength password={password} />}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm rounded-md py-2.5 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mt-2 inline-flex items-center justify-center gap-2"
          >
            {loading ? (<><Spinner size="md" />{isLogin ? t('auth.button.logging_in') : t('auth.button.creating')}</>) : (isLogin ? t('auth.button.login') : t('auth.button.register'))}
          </button>

          {!isLogin && (
            <p className="text-[11px] text-white/35 leading-relaxed mt-1">
              {t('auth.register.agreement_prefix')}{' '}
              <a
                href={ROUTES.tos}
                onClick={(e) => { e.preventDefault(); navigate(ROUTES.tos); }}
                className="text-[var(--accent)] hover:underline"
              >
                {t('auth.register.agreement_tos')}
              </a>
              {' '}{t('auth.register.agreement_and')}{' '}
              <a
                href={ROUTES.privacy}
                onClick={(e) => { e.preventDefault(); navigate(ROUTES.privacy); }}
                className="text-[var(--accent)] hover:underline"
              >
                {t('auth.register.agreement_privacy')}
              </a>.
            </p>
          )}

          {isLogin && (
            <div className="flex justify-start pt-1">
              <a
                href={ROUTES.forgotPassword}
                onClick={(e) => { e.preventDefault(); navigate(ROUTES.forgotPassword); }}
                className="text-[13px] text-[var(--accent)] hover:underline"
              >
                {t('auth.link.forgot_password')}
              </a>
            </div>
          )}
        </form>
      )}

      <p className="text-sm text-white/30 mt-8">
        {isLogin ? t('auth.link.no_account') : t('auth.link.have_account')}{' '}
        <a
          href={(isLogin ? ROUTES.register : ROUTES.login) + (typeof window !== 'undefined' ? window.location.search : '')}
          onClick={(e) => {
            e.preventDefault();
            navigate((isLogin ? ROUTES.register : ROUTES.login) + (typeof window !== 'undefined' ? window.location.search : ''));
          }}
          className="text-[var(--accent)] hover:underline font-medium"
        >
          {isLogin ? t('auth.link.create_one') : t('auth.button.login')}
        </a>
      </p>
    </AuthLayout>
  );
}