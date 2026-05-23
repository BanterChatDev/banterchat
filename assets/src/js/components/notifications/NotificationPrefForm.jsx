import React, { useEffect, useState } from 'react';
import Spinner from '../ui/Spinner';

const LEVELS = [
  { value: 'all',      label: 'All Messages',  hint: 'Notify for every message in this scope.' },
  { value: 'mentions', label: 'Only @mentions', hint: 'Only notify when you are directly mentioned.' },
  { value: 'nothing',  label: 'Nothing',        hint: 'Never notify, even for mentions.' },
];

export default function NotificationPrefForm({
  scopeLabel,
  scopeDescription,
  loading,
  pref,
  onSave,
  onReset,
  saving,
  showOverrideHint,
}) {
  const [draft, setDraft] = useState(pref);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => { setDraft(pref); }, [pref?.scope_type, pref?.scope_id]);

  if (loading || !draft) {
    return <div className="p-6 flex justify-center"><Spinner /></div>;
  }

  const update = (patch) => setDraft(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    try {
      await onSave(draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {}
  };

  return (
    <div className="p-6 max-w-2xl">
      <h3 className="text-sm font-semibold text-white/80 mb-1">Notifications · {scopeLabel}</h3>
      {scopeDescription && (
        <p className="text-xs text-white/40 mb-5">{scopeDescription}</p>
      )}

      {showOverrideHint && (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-3 mb-5 text-[12px] text-white/55 leading-relaxed">
          Settings here override your global notification preferences. Reset to remove the override and inherit from the level above.
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Notification Level</label>
          <div className="space-y-1.5">
            {LEVELS.map(lvl => {
              const active = draft.level === lvl.value;
              return (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => update({ level: lvl.value })}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent)]/[0.08]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${active ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-white/30'}`} />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] font-semibold ${active ? 'text-white/90' : 'text-white/75'}`}>{lvl.label}</span>
                    <span className="block text-[11px] text-white/40 mt-0.5">{lvl.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Mention Filters</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04]">
              <input
                type="checkbox"
                checked={!!draft.suppress_everyone}
                onChange={(e) => update({ suppress_everyone: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              <span className="flex-1">
                <span className="block text-[12px] text-white/75">Suppress @everyone and @here</span>
                <span className="block text-[10px] text-white/35">Don't notify me for mass mentions.</span>
              </span>
            </label>
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04]">
              <input
                type="checkbox"
                checked={!!draft.suppress_roles}
                onChange={(e) => update({ suppress_roles: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              <span className="flex-1">
                <span className="block text-[12px] text-white/75">Suppress role mentions</span>
                <span className="block text-[10px] text-white/35">Don't notify me when a role I'm in is mentioned.</span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="tw-btn-accent px-5 rounded-md disabled:opacity-40"
          >
            {saving ? 'Saving…' : savedFlash ? 'Saved!' : 'Save Changes'}
          </button>
          {onReset && (
            <button
              onClick={onReset}
              disabled={saving}
              className="tw-btn-secondary px-5 rounded-md disabled:opacity-40"
            >
              Reset to Defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}