import React from 'react';
import TriStateToggle, { TriStateLegend } from './TriStateToggle';

export default function PermissionToggleList({ permissions, getState, onToggle }) {
  return (
    <div className="p-3 sm:p-4 space-y-1">
      <div className="px-3 sm:px-4 pb-2">
        <TriStateLegend />
      </div>
      {permissions.map(p => {
        const state = getState(p.bit);
        return (
          <div
            key={p.key}
            className={`flex items-center justify-between gap-3 py-3 px-3 sm:px-4 rounded-lg transition-colors duration-150 border ${
              state === 'allow'
                ? 'border-emerald-500/10 bg-emerald-500/[0.03]'
                : state === 'deny'
                  ? 'border-red-500/10 bg-red-500/[0.03]'
                  : 'border-transparent hover:bg-white/[0.025]'
            }`}
          >
            <div className="min-w-0">
              <div className="text-[13px] text-[var(--text-primary)]/70 font-medium">{p.label}</div>
              <div className="text-[11px] text-[var(--text-primary)]/25 mt-0.5 leading-snug">{p.desc}</div>
            </div>
            <TriStateToggle value={state} onChange={(s) => onToggle(p.bit, s)} />
          </div>
        );
      })}
    </div>
  );
}