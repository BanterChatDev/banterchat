import React, { useMemo, useState } from 'react';
import { getAllPermissions } from '../../permissions/registry';
import { ClickCopy } from '../ui/ClickCopy';
import { useT } from '../../hooks/useT';

export default function OAuth2Tab({ app }) {
  const t = useT();
  const [bits, setBits] = useState(0n);
  const permissions = useMemo(() => getAllPermissions(), []);

  const toggle = (bit) => {
    setBits(prev => (prev & bit) ? prev & ~bit : prev | bit);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${baseUrl}/oauth2/authorize?client_id=${encodeURIComponent(app.id)}&permissions=${bits.toString()}&scope=bot`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">{t('developers.oauth2_heading')}</h2>
        <p className="text-sm text-white/40 mt-1">
          {t('developers.oauth2_subtitle')}
        </p>
      </div>

      <div className="mb-6 p-3 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-md min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{t('developers.oauth2_generated_url')}</div>
          <ClickCopy text={inviteUrl} label="Copy" className="text-[11px] text-white/50 hover:text-white shrink-0" />
        </div>
        <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded px-2.5 py-2 max-h-24 overflow-y-auto">
          <code className="block text-[11px] font-mono text-white/80 break-all select-all leading-relaxed">{inviteUrl}</code>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{t('ui.permissions_editor_role_header_label')}</h3>
            <p className="text-xs text-white/30 mt-0.5">{t('developers.oauth2_bitmask_template').replace('{n}', bits.toString())}</p>
          </div>
          <button
            onClick={() => setBits(0n)}
            className="text-xs text-white/40 hover:text-white/70"
          >
            {t('developers.oauth2_clear_all')}
          </button>
        </div>
        <div className="space-y-1">
          {permissions.map(p => {
            const checked = (bits & p.bit) !== 0n;
            return (
              <label
                key={p.bit}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  checked
                    ? 'border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.05)]'
                    : 'border-white/[0.06] hover:bg-white/[0.03]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.bit)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-white/80 font-medium">{p.label}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{p.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}