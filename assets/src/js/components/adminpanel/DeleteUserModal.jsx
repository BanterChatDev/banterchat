import React, { useState } from 'react';
import { apiAdminDeleteUser } from '../../api/admin';
import Modal, { ModalHeader } from '../ui/Modal';

export default function DeleteUserModal({ isOpen, onClose, user, onDeleted }) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const matches = confirmText === user.username;

  const submit = async () => {
    if (!matches) return;
    setSubmitting(true); setError('');
    try {
      await apiAdminDeleteUser(user.id);
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Delete user permanently" subtitle="This cannot be undone." />
      <div className="px-5 py-4 space-y-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3 text-[12px] text-red-300/90 leading-relaxed">
          This permanently deletes <span className="font-semibold text-red-200">@{user.username}</span>'s account, all their messages, sessions, and data. The username may become available again. Use suspension if you want to revoke access without losing data.
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
            Type <span className="font-mono text-white/70">{user.username}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-[var(--bg-input)] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white focus:outline-none focus:border-red-500 font-mono"
          />
        </div>
        {error && <div className="text-[12px] text-red-400">{error}</div>}
      </div>
      <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={submitting} className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white/90 hover:bg-white/[0.04] rounded-md disabled:opacity-50">Cancel</button>
        <button type="button" onClick={submit} disabled={submitting || !matches} className="px-3 py-1.5 text-[12px] bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-40">
          {submitting ? 'Deleting…' : 'Permanently delete'}
        </button>
      </div>
    </Modal>
  );
}