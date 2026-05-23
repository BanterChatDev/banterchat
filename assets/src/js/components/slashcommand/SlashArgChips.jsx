import React, { useEffect, useRef } from 'react';
import { useT } from '../../hooks/useT';

function OptionInput({ option, value, onChange, autoFocus, onEnter }) {
  const t = useT();
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter?.();
    }
  };

  const base = 'bg-transparent outline-none text-[13px] text-white/85 placeholder-white/25';

  // Dropdown path kept for string choices (enum-style args). Integers
  // always fall through to the number input below — number dropdowns
  // feel wrong in a chat composer.
  if (option.choices && option.choices.length > 0 && option.type !== 'integer') {
    return (
      <select
        ref={ref}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`${base} cursor-pointer pr-3`}
      >
        <option value="" disabled className="bg-neutral-900">{option.description || option.name}</option>
        {option.choices.map((c) => (
          <option key={c.value} value={c.value} className="bg-neutral-900">{c.name}</option>
        ))}
      </select>
    );
  }
  if (option.type === 'boolean') {
    const b = value === true || value === 'true';
    return (
      <button
        type="button"
        ref={ref}
        onClick={() => onChange(!b)}
        onKeyDown={onKeyDown}
        className={`${base} cursor-pointer`}
      >
        {b ? t('slash.bool_true') : t('slash.bool_false')}
      </button>
    );
  }
  const placeholder = option.description || option.name;
  const width = Math.max(60, Math.min(200, ((value?.length || placeholder.length) + 2) * 7));
  return (
    <input
      ref={ref}
      type={option.type === 'integer' ? 'number' : 'text'}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={base}
      style={{ width: `${width}px` }}
    />
  );
}

export default function SlashArgChips({ cmd, args, setArg, onCancel, onSubmit }) {
  const t = useT();
  const options = cmd?.options || [];
  const missing = options.filter(
    (o) => o.required && (args[o.name] === undefined || args[o.name] === ''),
  );
  const canSubmit = missing.length === 0;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="flex items-center gap-2 flex-wrap min-w-0 py-1">
      <span className="text-[13px] text-[rgb(var(--accent-rgb)/0.85)] font-medium whitespace-nowrap">
        /{cmd.name}
      </span>
      {options.map((opt, i) => {
        const filled = args[opt.name] !== undefined && args[opt.name] !== '';
        const needed = opt.required && !filled;
        const isOptional = !opt.required;
        return (
          <div
            key={opt.name}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${
              needed
                ? 'border-red-400/30'
                : filled
                  ? 'border-white/[0.10] bg-white/[0.03]'
                  : isOptional
                    ? 'border-white/[0.04] border-dashed'
                    : 'border-white/[0.06]'
            }`}
          >
            <span className="text-[11px] text-white/35">{opt.name}</span>
            {isOptional && !filled && (
              <span className="text-[10px] text-white/25 italic">{t('slash.optional_short')}</span>
            )}
            <span className="text-white/20 text-[11px]">:</span>
            <OptionInput
              option={opt}
              value={args[opt.name]}
              onChange={(v) => setArg(opt.name, v)}
              autoFocus={i === 0}
              onEnter={() => { if (canSubmit) onSubmit(); }}
            />
          </div>
        );
      })}
    </div>
  );
}