import React, { useState } from 'react';
import Modal, { ModalHeader, ModalActions } from '../ui/Modal';
import { ClickCopy } from '../ui/ClickCopy';
import { ShieldIcon, EyeIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function TokenRevealModal({ isOpen, onClose, appName, token }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const masked = token ? token.slice(0, 4) + '•'.repeat(Math.max(0, token.length - 8)) + token.slice(-4) : '';
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        icon={<ShieldIcon className="w-5 h-5" />}
        title={t('developers.token_modal_title_template').replace('{name}', appName)}
        subtitle={t('developers.token_modal_subtitle')}
      />
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-md p-3 mb-3">
        <code className="block text-xs font-mono break-all text-white/80 select-all mb-2">{shown ? token : masked}</code>
        <div className="flex items-center justify-between gap-2">
          <ClickCopy text={token} className="text-xs text-white/40 hover:text-white/70" />
          <button onClick={() => setShown(s => !s)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
            <EyeIcon className="w-3 h-3" />
            {shown ? t('developers.token_hide') : t('developers.token_show')}
          </button>
        </div>
      </div>
      <p className="text-xs text-white/30 mb-4">
        {t('developers.token_modal_body')}
      </p>
      <ModalActions>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-md text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold"
        >
          {t('developers.token_modal_btn')}
        </button>
      </ModalActions>
    </Modal>
  );
}