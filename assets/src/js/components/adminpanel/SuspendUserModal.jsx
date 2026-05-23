import React, { useState } from 'react';
import { apiAdminSuspendUser } from '../../api/admin';
import Modal, { ModalHeader } from '../ui/Modal';

const DURATIONS = [
  { id: '1d', label: '1 day', hours: 24 },
  { id: '7d', label: '7 days', hours: 24 * 7 },
  { id: '30d', label: '30 days', hours: 24 * 30 },
  { id: 'perm', label: 'Permanent', hours: 0 },
  { id: 'custom', label: 'Custom', hours: -1 },
];

export default function SuspendUserModal({ isOpen, onClose, user, onSuspended }) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7d');
  const [customUntil, setCustomUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const submit = async () => {
    setSubmitting(true); setError('');
    let untilIso = '';
    if (duration === 'custom') {
      if (!customUntil) { setError('Pick a date and time.'); setSubmitting(false); return; }
      untilIso = new Date(customUntil).toISOString();
    } else if (duration !== 'perm') {
      const opt = DURATIONS.find(d => d.id === duration);
      untilIso = new Date(Date.now() + opt.hours * 3600 * 1000).toISOString();
    }
    try {
      await apiAdminSuspendUser(user.id, reason.trim(), untilIso);
      onSuspended?.();
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to suspend user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Suspend user" subtitle={`@${user.username}`} />
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Shown to the user when they try to log in."
            rows={3}
            maxLength={500}
            className="w-full bg-[var(--bg-input)] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[var(--accent)] resize-y"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Duration</label>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDuration(opt.id)}
                className={`px-2 py-2 rounded-md text-[12px] font-semibold border ${duration === opt.id ? 'border-[var(--accent)] bg-[var(--accent)]/[0.1] text-white' : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.05]'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {duration === 'custom' && (
            <input
              type="datetime-local"
              value={customUntil}
              onChange={(e) => setCustomUntil(e.target.value)}
              className="mt-2 w-full bg-[var(--bg-input)] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[var(--accent)]"
            />
          )}
        </div>
        {error && <div className="text-[12px] text-red-400">{error}</div>}
      </div>
      <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={submitting} className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white/90 hover:bg-white/[0.04] rounded-md disabled:opacity-50">Cancel</button>
        <button type="button" onClick={submit} disabled={submitting || !reason.trim()} className="px-3 py-1.5 text-[12px] bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50">
          {submitting ? 'Suspending…' : 'Suspend'}
        </button>
      </div>
    </Modal>
  );
}