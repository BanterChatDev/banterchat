import React, { useState } from 'react';
import Modal, { ModalHeader, ModalActions, ModalError } from './Modal';
import { useT } from '../../hooks/useT';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, subtitle, body, confirmLabel, destructive = false, icon }) {
  const t = useT();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setError('');
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err?.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <ModalHeader icon={icon} title={title} subtitle={subtitle} />
      {body && <p className="text-sm text-white/60 mb-4">{body}</p>}
      <ModalError message={error} />
      <ModalActions>
        <button
          onClick={handleClose}
          disabled={busy}
          className="flex-1 px-4 py-2 rounded-md text-sm bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 ${
            destructive ? 'bg-red-500/80 hover:bg-red-500 text-white' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
          }`}
        >
          {busy ? t('common.working') : (confirmLabel ?? t('common.confirm'))}
        </button>
      </ModalActions>
    </Modal>
  );
}