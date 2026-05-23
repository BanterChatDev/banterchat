import React, { useState, useEffect, useRef } from 'react';
import Modal, { ModalHeader, ModalActions, ModalError } from '../ui/Modal';
import { apiCreateCategory } from '../../api/categories';
import { useT } from '../../hooks/useT';

export default function CreateCategoryModal({ isOpen, onClose, onCreated, guildId }) {
  const t = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      setError(t('common.name_validation').replace('{min}', 1).replace('{max}', 30));
      return;
    }
    if (!guildId) {
      setError(t('channels.create_modal.no_guild'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cat = await apiCreateCategory(guildId, trimmed);
      onCreated?.(cat);
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div>
        <ModalHeader
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          title={t('categories.create_modal.title')}
          subtitle={t('categories.create_modal.subtitle')}
        />
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-fluid-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t('categories.create_modal.label_name')}</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('categories.create_modal.placeholder_name')}
              className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
              maxLength={30}
            />
          </div>

          <ModalError message={error} />
          <ModalActions>
            <button type="button" onClick={onClose} className="flex-1 text-fluid-sm text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg py-fluid-2 transition-all duration-200">{t('common.cancel')}</button>
            <button type="submit" disabled={!name.trim() || loading} className="flex-1 text-fluid-sm font-semibold text-[var(--bg-deepest)] bg-white/90 hover:bg-white rounded-lg py-fluid-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">{loading ? t('categories.create_modal.btn_creating') : t('categories.create_modal.btn_create')}</button>
          </ModalActions>
        </form>
      </div>
    </Modal>
  );
}