import React, { useState } from 'react';
import { rotateToken, deleteApp } from '../../api/developers';
import ConfirmModal from './ConfirmModal';
import TokenRevealModal from './TokenRevealModal';
import { TrashIcon, ShieldIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function DangerZoneTab({ app, onDeleted }) {
  const t = useT();
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tokenModal, setTokenModal] = useState(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">{t('developers.danger_heading')}</h2>
        <p className="text-sm text-white/40 mt-1">{t('developers.danger_subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{t('developers.danger_rotate_heading')}</h3>
            <p className="text-xs text-white/40 mt-1">
              {t('developers.danger_rotate_body')}
            </p>
          </div>
          <button
            onClick={() => setRotating(true)}
            className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs bg-white/[0.06] hover:bg-white/[0.12] text-white/80"
          >
            {t('developers.danger_rotate_btn')}
          </button>
        </div>

        <div className="p-4 bg-[rgb(var(--accent-danger-rgb)/0.04)] border border-[rgb(var(--accent-danger-rgb)/0.2)] rounded-lg flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--accent-danger)]">{t('developers.danger_delete_heading')}</h3>
            <p className="text-xs text-[rgb(var(--accent-danger-rgb)/0.6)] mt-1">
              {t('developers.danger_delete_body')}
            </p>
          </div>
          <button
            onClick={() => setDeleting(true)}
            className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs bg-[rgb(var(--accent-danger-rgb)/0.15)] hover:bg-[rgb(var(--accent-danger-rgb)/0.25)] text-[var(--accent-danger)]"
          >
            {t('developers.danger_delete_btn')}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={rotating}
        onClose={() => setRotating(false)}
        onConfirm={async () => {
          const token = await rotateToken(app.id);
          setTokenModal({ name: app.name, token });
        }}
        title={t('developers.rotate_confirm_title_template').replace('{name}', app.name)}
        body={t('developers.rotate_confirm_body')}
        confirmLabel={t('developers.rotate_confirm_btn')}
        icon={<ShieldIcon className="w-5 h-5" />}
      />

      <ConfirmModal
        isOpen={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          await deleteApp(app.id);
          if (onDeleted) onDeleted();
        }}
        title={t('developers.delete_confirm_title_template').replace('{name}', app.name)}
        body={t('developers.delete_confirm_body')}
        confirmLabel={t('developers.delete_confirm_btn')}
        destructive
        icon={<TrashIcon className="w-5 h-5" />}
      />

      <TokenRevealModal
        isOpen={!!tokenModal}
        onClose={() => setTokenModal(null)}
        appName={tokenModal?.name || ''}
        token={tokenModal?.token || ''}
      />
    </div>
  );
}