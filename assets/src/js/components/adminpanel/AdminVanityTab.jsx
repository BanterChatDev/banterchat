import React, { useState, useCallback, useEffect } from 'react';
import { apiAdminListReservedVanities, apiAdminReserveVanity, apiAdminForceClearVanity } from '../../api/admin';
import Modal, { ModalHeader, ModalActions, ModalError } from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { LockIcon } from '../icons';

function ReserveModal({ isOpen, onClose, onReserved }) {
  const [slug, setSlug] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSlug(''); setReason(''); setError('');
  }, [isOpen]);

  const submit = async () => {
    const s = slug.trim().toLowerCase();
    if (!s) { setError('Slug required.'); return; }
    setError(''); setLoading(true);
    try {
      await apiAdminReserveVanity(s, reason.trim());
      onReserved?.();
      onClose();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader icon={<LockIcon className="w-5 h-5" />} title="Reserve Vanity Slug" subtitle="Block this slug from being claimed by any guild" />
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-reserved-slug"
            className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 font-mono"
            maxLength={32}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this slug reserved"
            className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20"
            maxLength={200}
          />
        </div>
        <ModalError message={error} />
      </div>
      <ModalActions>
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 disabled:opacity-40">Cancel</button>
        <button onClick={submit} disabled={loading} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40">
          {loading ? 'Reserving…' : 'Reserve'}
        </button>
      </ModalActions>
    </Modal>
  );
}

function ForceClearModal({ isOpen, onClose, onCleared }) {
  const [guildId, setGuildId] = useState('');
  const [reason, setReason] = useState('');
  const [lock, setLock] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGuildId(''); setReason(''); setLock(false); setError('');
  }, [isOpen]);

  const submit = async () => {
    const g = guildId.trim();
    if (!g) { setError('Guild ID required.'); return; }
    setError(''); setLoading(true);
    try {
      await apiAdminForceClearVanity(g, reason.trim(), lock);
      onCleared?.();
      onClose();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title="Force-Clear a Guild's Vanity" subtitle="Removes the vanity and optionally reserves the slug" />
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Guild ID</label>
          <input
            type="text"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            placeholder="00000000000000000000000000000000"
            className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 font-mono"
            maxLength={48}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ToS violation, impersonation, etc."
            className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20"
            maxLength={200}
          />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-white/60 cursor-pointer">
          <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="accent-[var(--accent)]" />
          Also reserve this slug to prevent re-claiming
        </label>
        <ModalError message={error} />
      </div>
      <ModalActions>
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 disabled:opacity-40">Cancel</button>
        <button onClick={submit} disabled={loading} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40">
          {loading ? 'Clearing…' : 'Force Clear'}
        </button>
      </ModalActions>
    </Modal>
  );
}

export default function AdminVanityTab() {
  const [reserved, setReserved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiAdminListReservedVanities()
      .then(r => setReserved(r.reserved || []))
      .catch(() => setReserved([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold text-white/90">Vanity URLs</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setClearOpen(true)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/80"
          >
            Force-Clear Guild
          </button>
          <button
            onClick={() => setReserveOpen(true)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white"
          >
            + Reserve Slug
          </button>
        </div>
      </div>

      <div className="mb-3 text-[12px] text-white/40">
        Reserved slugs cannot be claimed by any guild. {reserved.length} currently reserved.
      </div>

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-[200px_1fr_140px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40">
          <div>Slug</div>
          <div>Reason</div>
          <div>Reserved At</div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : reserved.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-white/30">No reserved slugs.</div>
        ) : reserved.map(r => (
          <div key={r.slug} className="grid grid-cols-[200px_1fr_140px] gap-3 px-4 py-2.5 items-center border-b border-white/[0.04]">
            <div className="text-[13px] font-mono text-white/80 truncate">{r.slug}</div>
            <div className="text-[12px] text-white/55 truncate">{r.reason || '—'}</div>
            <div className="text-[11px] text-white/40 tabular-nums">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</div>
          </div>
        ))}
      </div>

      <ReserveModal isOpen={reserveOpen} onClose={() => setReserveOpen(false)} onReserved={load} />
      <ForceClearModal isOpen={clearOpen} onClose={() => setClearOpen(false)} onCleared={load} />
    </div>
  );
}