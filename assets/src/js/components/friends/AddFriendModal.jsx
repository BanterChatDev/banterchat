import React, { useState } from 'react';
import { apiSendFriendRequest } from '../../api/friends';
import Modal, { ModalHeader, ModalActions } from '../ui/Modal';
import { useT } from '../../hooks/useT';

export default function AddFriendModal({ isOpen, onClose, onSent }) {
  const t = useT();
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => { setUsername(''); setError(''); setSuccess(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSend = async () => {
    setError(''); setSuccess('');
    if (!username.trim()) { setError(t('friends.add_modal.validation_empty')); return; }
    setSending(true);
    try {
      await apiSendFriendRequest(username.trim());
      setSuccess(t('friends.add_modal.success_template').replace('{username}', username.trim()));
      setUsername('');
      if (onSent) onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <ModalHeader title={t('friends.add_modal.title')} subtitle={t('friends.add_modal.subtitle')} />
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}
      {success ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-3 mb-3">
          <p className="text-[13px] text-emerald-400">{success}</p>
        </div>
      ) : (
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder={t('friends.add_modal.placeholder')}
          className="tw-input w-full rounded-md px-3 py-2 mb-1"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
      )}
      <ModalActions>
        <button onClick={handleClose} className="tw-btn-secondary rounded-md px-4 flex-1">
          {success ? t('common.close') : t('common.cancel')}
        </button>
        {!success && (
          <button onClick={handleSend} disabled={sending} className="tw-btn-accent rounded-md px-4 flex-1">
            {sending ? t('friends.add_modal.btn_sending') : t('friends.add_modal.btn_send')}
          </button>
        )}
      </ModalActions>
    </Modal>
  );
}