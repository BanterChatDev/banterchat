import React, { useEffect, useRef, useState } from 'react';
import Modal, { ModalHeader, ModalActions, ModalError } from '../ui/Modal';
import { HashIcon } from '../icons';
import { apiCreateThread } from '../../api/threads';
import { useT } from '../../hooks/useT';

export default function CreateThreadModal({ isOpen, parentChannelId, parentMessageId = '', onClose, onCreated }) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const submit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError(t('common.name_validation').replace('{min}', 2).replace('{max}', 30));
      return;
    }
    if (!parentChannelId) {
      setError(t('threads.create_modal.no_parent'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await apiCreateThread(parentChannelId, trimmed, parentMessageId || '');
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setError(err?.message || t('threads.create_modal.fail'));
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div>
        <ModalHeader
          icon={<HashIcon className="w-4 h-4" />}
          title={t('threads.create_modal.title')}
          subtitle={parentMessageId ? t('threads.create_modal.subtitle_from_message') : t('threads.create_modal.subtitle')}
        />
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-fluid-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t('threads.create_modal.label_name')}</label>
            <div className="flex items-center bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg overflow-hidden focus-within:border-white/20 transition-colors">
              <span className="pl-3 text-white/20 text-sm">#</span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={t('threads.create_modal.placeholder_name')}
                className="flex-1 bg-transparent px-2 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none"
                maxLength={30}
              />
            </div>
          </div>
          <ModalError message={error} />
          <ModalActions>
            <button type="button" onClick={onClose} className="flex-1 text-fluid-sm text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg py-fluid-2 transition-all duration-200">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="flex-1 text-fluid-sm font-semibold text-[var(--bg-deepest)] bg-white/90 hover:bg-white rounded-lg py-fluid-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {busy ? t('threads.create_modal.btn_creating') : t('threads.create_modal.btn_create')}
            </button>
          </ModalActions>
        </form>
      </div>
    </Modal>
  );
}