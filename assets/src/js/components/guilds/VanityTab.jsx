import React, { useEffect, useState, useCallback } from 'react';
import { apiGetVanity, apiSetVanity, apiRemoveVanity } from '../../api/vanity';
import Spinner from '../ui/Spinner';
import { ClickCopy } from '../ui/ClickCopy';
import { LockIcon } from '../icons';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

export default function VanityTab({ guildId, canManage }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(() => {
    if (!guildId) return;
    setLoading(true);
    apiGetVanity(guildId)
      .then(d => { setInfo(d); setDraft(d?.slug || ''); })
      .catch(() => { setInfo(null); setDraft(''); })
      .finally(() => setLoading(false));
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const s = draft.trim().toLowerCase();
    if (!SLUG_RE.test(s)) {
      setError('Slug must be 2–32 chars: a–z, 0–9, hyphen. No leading/trailing hyphen.');
      return;
    }
    setError(''); setSaving(true);
    try {
      const res = await apiSetVanity(guildId, s);
      setInfo({ slug: res.slug, url: res.url, locked: false, use_count: info?.use_count || 0 });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const remove = async () => {
    if (!confirm('Remove this vanity URL? Anyone using it to invite will need a new link.')) return;
    setSaving(true);
    try {
      await apiRemoveVanity(guildId);
      setInfo(null); setDraft('');
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  if (loading) return <div className="p-6 flex justify-center"><Spinner /></div>;

  const slug = info?.slug || '';
  const isSet = !!slug;
  const locked = !!info?.locked;
  const dirty = draft.trim().toLowerCase() !== slug;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <h3 className="text-sm font-semibold text-white/80">Vanity URL</h3>
        {locked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/15 text-red-400/90">
            <LockIcon className="w-3 h-3" /> Locked
          </span>
        )}
      </div>
      <p className="text-xs text-white/40 mb-5">A short, memorable URL that points to your server invite.</p>

      {locked ? (
        <div className="rounded-lg bg-red-500/[0.06] border border-red-500/20 p-3 mb-4 text-[12px] text-red-300/80 leading-relaxed">
          A site administrator has locked this server's vanity URL. You can't change it.
        </div>
      ) : !canManage ? (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-3 mb-4 text-[12px] text-white/50 leading-relaxed">
          You need the Manage Vanity URL permission to change this setting.
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <label className="tw-label mb-1.5">Slug</label>
          <div className="flex items-stretch gap-0">
            <span className="px-3 py-2 text-[13px] text-white/40 bg-[var(--bg-tertiary)] border border-r-0 border-[var(--border-medium)] rounded-l-lg select-none">
              /invite/
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              disabled={!canManage || locked || saving}
              placeholder="my-cool-server"
              className="flex-1 tw-input px-3 py-2 text-[13px] rounded-l-none rounded-r-lg disabled:opacity-50"
              maxLength={32}
            />
          </div>
        </div>

        {isSet && info?.url && (
          <div className="rounded-lg bg-[var(--bg-tertiary)] border border-white/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 shrink-0">Invite URL</span>
              <ClickCopy text={info.url} className="text-[12px] font-mono text-white/70 min-w-0" />
            </div>
            {typeof info.use_count === 'number' && info.use_count > 0 && (
              <div className="text-[11px] text-white/30 pt-1 border-t border-white/[0.04]">
                Used to invite {info.use_count.toLocaleString()} time{info.use_count === 1 ? '' : 's'}.
              </div>
            )}
          </div>
        )}

        {error && <div className="text-[12px] text-red-400">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={!canManage || locked || saving || !dirty || !draft.trim()}
            className="tw-btn-accent px-5 rounded-md disabled:opacity-40"
          >
            {saving ? 'Saving…' : savedFlash ? 'Saved!' : isSet ? 'Update Slug' : 'Claim Slug'}
          </button>
          {isSet && canManage && !locked && (
            <button onClick={remove} disabled={saving} className="tw-btn-secondary px-5 rounded-md disabled:opacity-40">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}