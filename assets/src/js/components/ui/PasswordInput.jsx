import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../icons';

export default function PasswordInput({
  value,
  onChange,
  placeholder = '',
  autoComplete = 'current-password',
  variant = 'settings',
  className = '',
  inputClassName = '',
  ...rest
}) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  const base = 'w-full text-sm text-white/85 placeholder-white/20 focus:outline-none transition-colors';
  const variantClass = variant === 'auth'
    ? 'bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-2.5 focus:border-white/[0.12]'
    : 'bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-xl px-3 py-2.5 focus:border-white/20';
  const ringWrap = variant === 'auth'
    ? `relative rounded-md transition-all ${focused ? 'ring-1 ring-[var(--accent)]' : ''}`
    : 'relative';

  return (
    <div className={`${ringWrap} ${className}`}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${base} ${variantClass} pr-9 ${inputClassName}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors p-1 rounded"
      >
        {visible ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}