import React, { useEffect, useState } from 'react';
import Modal, { ModalHeader } from '../ui/Modal';
import { ShieldIcon } from '../icons';
import { useT } from '../../hooks/useT';

function formatTs(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function BanModal() {
  const t = useT();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const onOpen = (ev) => { setInfo(ev.detail || null); };
    window.addEventListener('openBanModal', onOpen);
    return () => window.removeEventListener('openBanModal', onOpen);
  }, []);

  if (!info) return null;

  return (
    <Modal isOpen={true} onClose={() => {}} size="md">
      <ModalHeader
        icon={<ShieldIcon className="w-5 h-5" />}
        title={t('auth.block.banned_title')}
      />
      <div className="space-y-3">
        {info.reason && (
          <div className="rounded-lg bg-red-500/[0.06] border border-red-500/20 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-1.5">{t('auth.block.reason_label')}</div>
            <p className="text-[13px] text-white/85 leading-snug whitespace-pre-wrap break-words">{info.reason}</p>
          </div>
        )}
        {info.banned_by_username && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">{t('auth.block.by_label')}</div>
            <p className="text-[13px] text-white/70">{info.banned_by_username}</p>
          </div>
        )}
        {info.created_at && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">{t('auth.block.when_label')}</div>
            <p className="text-[13px] text-white/70">{formatTs(info.created_at)}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
        <button
          onClick={() => setInfo(null)}
          className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white"
        >
          {t('common.close')}
        </button>
      </div>
    </Modal>
  );
}