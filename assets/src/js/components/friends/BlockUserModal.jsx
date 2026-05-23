import React, { useState } from 'react';
import { useBlocks } from '../../hooks/useBlocks';
import Modal, { ModalHeader, ModalActions } from '../ui/Modal';
import { useT } from '../../hooks/useT';

export default function BlockUserModal({ isOpen, onClose, onBlocked }) {
  const t = useT();
  const { block } = useBlocks();
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setUsername(''); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleBlock = async () => {
    setError('');
    if (!username.trim()) { setError(t('friends.add_modal.validation_empty')); return; }
    setSending(true);
    try {
      await block(username.trim());
      setUsername('');
      if (onBlocked) onBlocked();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <ModalHeader title={t('friends.block_modal.title')} subtitle={t('friends.block_modal.subtitle')} />
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder={t('friends.add_modal.placeholder')}
        className="tw-input w-full rounded-md px-3 py-2 mb-1"
        autoFocus
        onKeyDown={e => e.key === 'Enter' && handleBlock()}
      />
      <ModalActions>
        <button onClick={handleClose} className="tw-btn-secondary rounded-md px-4 flex-1">{t('common.cancel')}</button>
        <button onClick={handleBlock} disabled={sending} className="tw-btn-accent rounded-md px-4 flex-1">
          {sending ? t('friends.block_modal.btn_blocking') : t('friends.block_modal.btn_block')}
        </button>
      </ModalActions>
    </Modal>
  );
}