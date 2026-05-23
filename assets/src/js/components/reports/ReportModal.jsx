import React, { useState } from 'react';
import Modal, { ModalHeader } from '../ui/Modal';
import { apiCreateReport } from '../../api/reports';
import { FlagIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetLabel }) {
  const t = useT();
  const TARGET_LABEL = { user: t('reports.target_user'), message: t('reports.target_message'), guild: t('reports.target_guild') };
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSending(true); setError('');
    try {
      await apiCreateReport(targetType, targetId, reason.trim());
      setSent(true);
      setTimeout(() => { onClose(); setSent(false); setReason(''); }, 1200);
    } catch (e) {
      setError(e.message || t('reports.fail_submit'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setReason(''); setError(''); }} size="sm">
      <ModalHeader
        icon={<FlagIcon className="w-5 h-5 text-red-400" />}
        title={t('reports.title_template').replace('{target}', TARGET_LABEL[targetType] || t('reports.target_fallback'))}
        subtitle={targetLabel ? t('reports.subtitle_label_template').replace('{label}', targetLabel) : t('reports.subtitle_id_template').replace('{id}', targetId)}
      />
      {sent ? (
        <div className="py-6 text-center">
          <p className="text-[14px] text-emerald-400 font-semibold mb-1">{t('reports.submitted_title')}</p>
          <p className="text-[12px] text-white/40">{t('reports.submitted_body')}</p>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-white/60 mb-3">
            {t('reports.intro')}
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('reports.reason_placeholder')}
            maxLength={500}
            className="w-full bg-[var(--bg-input)] border border-white/[0.08] rounded-md px-3 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/[0.18] resize-none h-24"
          />
          <div className="flex items-center justify-between mt-1 mb-3">
            <span className="text-[10px] text-white/20">{reason.length}/500</span>
            {error && <span className="text-[11px] text-red-400">{error}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onClose(); setReason(''); }} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70">{t('common.cancel')}</button>
            <button disabled={sending} onClick={submit} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40">
              {sending ? t('reports.btn_sending') : t('reports.btn_submit')}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}