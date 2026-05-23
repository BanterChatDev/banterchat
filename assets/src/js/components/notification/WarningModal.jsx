import React, { useEffect, useState, useCallback } from 'react';
import Modal, { ModalHeader } from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { ShieldIcon } from '../icons';
import { usePermEvents } from '../../hooks/usePermEvents';
import { apiListMyWarnings, apiAcknowledgeWarning } from '../../api/me_warnings';

export default function WarningModal({ user }) {
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    apiListMyWarnings()
      .then(r => {
        const unacked = (r.warnings || []).filter(w => !w.acknowledged);
        setQueue(unacked);
      })
      .catch(() => {});
  }, [userId]);

  usePermEvents({
    warningIssued: (data) => {
      setQueue(prev => {
        if (prev.some(w => w.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          reasons: data.reasons || [],
          note: data.note || '',
          severity: data.severity || 1,
          acknowledged: false,
          created_at: data.created_at,
        }];
      });
    },
  });

  if (!user || queue.length === 0) return null;
  const current = queue[0];

  const ack = async () => {
    setBusy(true);
    try { await apiAcknowledgeWarning(current.id); } catch {}
    setBusy(false);
    setQueue(q => q.slice(1));
  };

  return (
    <Modal isOpen={true} onClose={() => {}} size="md">
      <ModalHeader
        icon={<ShieldIcon className="w-5 h-5" />}
        title="You've been warned"
        subtitle={`Severity ${current.severity} of 5`}
      />

      <div className="space-y-3">
        <p className="text-[13px] text-white/70 leading-relaxed">
          You have been warned by the official BanterChat admins. Please be sure to follow our terms of service.
        </p>

        {current.reasons.length > 0 && (
          <div className="rounded-lg bg-red-500/[0.06] border border-red-500/20 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-1.5">Reasons</div>
            <ul className="text-[13px] text-white/80 list-disc list-inside space-y-1">
              {current.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {current.note && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Additional Note</div>
            <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap break-words">{current.note}</p>
          </div>
        )}

        <p className="text-[12px] text-white/40">
          Read our terms at <a href="https://banterchat.org/terms" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">banterchat.org/terms</a>.
        </p>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
        <button
          onClick={ack}
          disabled={busy}
          className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40"
        >
          {busy ? <Spinner /> : queue.length > 1 ? `I Understand (${queue.length} pending)` : 'I Understand'}
        </button>
      </div>
    </Modal>
  );
}