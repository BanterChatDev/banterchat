import React, { useState, useEffect, useRef } from 'react';
import Modal, { ModalHeader, ModalActions, ModalError } from '../ui/Modal';
import { HashIcon, VolumeIcon } from '../icons';
import { apiCreateChannel } from '../../api/channels';
import { useT } from '../../hooks/useT';

export default function CreateChannelModal({ isOpen, onClose, onCreated, categoryId, guildId }) {
  const t = useT();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [channelType, setChannelType] = useState('text');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDesc('');
      setChannelType('text');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError(t('common.name_validation').replace('{min}', 2).replace('{max}', 30));
      return;
    }
    if (!guildId) {
      setError(t('channels.create_modal.no_guild'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const ch = await apiCreateChannel(guildId, trimmed, desc.trim(), categoryId, channelType);
      onCreated(ch);
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
        icon={<HashIcon className="w-4 h-4" />}
          title={t('channels.create_modal.title')}
          subtitle={t('channels.create_modal.subtitle')}
        />

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-fluid-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t('channels.create_modal.label_type')}</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setChannelType('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${channelType === 'text' ? 'bg-white/[0.1] text-white/80 border border-white/20' : 'bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.06]'}`}>
                <span className="text-base leading-none">#</span> {t('channels.create_modal.type_text')}
              </button>
              <button type="button" onClick={() => setChannelType('voice')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${channelType === 'voice' ? 'bg-white/[0.1] text-white/80 border border-white/20' : 'bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.06]'}`}>
                <VolumeIcon className="w-4 h-4" /> {t('channels.create_modal.type_voice')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-fluid-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t('channels.create_modal.label_name')}</label>
            <div className="flex items-center bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg overflow-hidden focus-within:border-white/20 transition-colors">
              <span className="pl-3 text-white/20 text-sm">#</span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={t('channels.create_modal.placeholder_name')}
                className="flex-1 bg-transparent px-2 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none"
                maxLength={30}
              />
            </div>
          </div>
          <div>
            <label className="block text-fluid-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t('channels.create_modal.label_description')} <span className="text-white/15">{t('channels.create_modal.optional_suffix')}</span></label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('channels.create_modal.placeholder_description')}
              className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
              maxLength={100}
            />
          </div>

          <ModalError message={error} />

          <ModalActions>
            <button type="button" onClick={onClose} className="flex-1 text-fluid-sm text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg py-fluid-2 transition-all duration-200">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 text-fluid-sm font-semibold text-[var(--bg-deepest)] bg-white/90 hover:bg-white rounded-lg py-fluid-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? t('channels.create_modal.btn_creating') : t('channels.create_modal.btn_create')}
            </button>
          </ModalActions>
        </form>
      </div>
    </Modal>
  );
}