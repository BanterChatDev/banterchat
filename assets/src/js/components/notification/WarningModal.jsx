import React, { useEffect, useState, useCallback } from 'react';
import Modal, { ModalHeader } from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { ShieldIcon } from '../icons';
import { usePermEvents } from '../../hooks/usePermEvents';
import { apiListMyWarnings, apiAcknowledgeWarning } from '../../api/me_warnings';
import { useT } from '../../hooks/useT';
import { TERMS_URL } from '../../config';

export default function WarningModal({ user }) {
  const t = useT();
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
        title={t('warning_modal.title')}
        subtitle={t('warning_modal.severity_template', { n: current.severity })}
      />

      <div className="space-y-3">
        <p className="text-[13px] text-white/70 leading-relaxed">
          {t('warning_modal.body')}
        </p>

        {current.reasons.length > 0 && (
          <div className="rounded-lg bg-red-500/[0.06] border border-red-500/20 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-1.5">{t('warning_modal.reasons_heading')}</div>
            <ul className="text-[13px] text-white/80 list-disc list-inside space-y-1">
              {current.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {current.note && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">{t('warning_modal.note_heading')}</div>
            <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap break-words">{current.note}</p>
          </div>
        )}

        {TERMS_URL && (
          <p className="text-[12px] text-white/40">
            {t('warning_modal.terms_prefix')} <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">{TERMS_URL.replace(/^https?:\/\//, '')}</a>
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
        <button
          onClick={ack}
          disabled={busy}
          className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40"
        >
          {busy ? <Spinner /> : queue.length > 1 ? t('warning_modal.ack_template', { n: queue.length }) : t('warning_modal.ack')}
        </button>
      </div>
    </Modal>
  );
}