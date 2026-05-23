import React, { useState, useEffect, useRef } from 'react';
import { ModalError } from '../ui/Modal';
import { apiUpdateCategory, apiGetCategoryPerms, apiSetCategoryPerm } from '../../api/categories';
import usePermOverrides from '../../hooks/usePermOverrides';
import PermissionsEditor from '../ui/PermissionsEditor';
import FullscreenLayout from '../ui/FullscreenLayout';
import { getSettingsTabs } from '../settings/settingsTabs';
import { useT } from '../../hooks/useT';

export default function EditCategoryModal({ isOpen, onClose, category }) {
  const t = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const perm = usePermOverrides(apiGetCategoryPerms, apiSetCategoryPerm, null, category?.guild_id);

  useEffect(() => {
    if (isOpen && category) {
      setName(category.name || '');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
      perm.loadPerms(category.id);
    }
  }, [isOpen, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      setError(t('common.name_validation').replace('{min}', 1).replace('{max}', 30));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiUpdateCategory(category.id, { name: trimmed });
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const savePerms = () => perm.savePerms(category.id);

  if (!isOpen || !category) return null;

  return (
    <FullscreenLayout title={t('categories.edit_modal.fullscreen_title')} subtitle={category.name} tabs={getSettingsTabs()} onClose={onClose} defaultTab="general">
      {(tab) => (
        <>
          {tab === 'general' && (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="tw-card p-4 sm:p-5 space-y-4">
                  <div>
                    <label className="tw-label mb-2">{t('categories.create_modal.label_name')}</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('categories.edit_modal.placeholder_name')}
                      className="w-full tw-input px-3 py-2.5"
                      maxLength={30}
                    />
                  </div>
                </div>
                <ModalError message={error} />
                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className="flex-1 tw-btn-secondary">{t('common.cancel')}</button>
                  <button type="submit" disabled={!name.trim() || loading} className="flex-1 tw-btn-primary">{loading ? t('common.saving') : t('common.save_changes')}</button>
                </div>
              </form>
            </div>
          )}
          {tab === 'permissions' && (
            <PermissionsEditor roles={perm.roles} overrides={perm.overrides} setOverrides={perm.setOverrides} permLoading={perm.permLoading} permSaving={perm.permSaving} onSave={savePerms} onClose={onClose} />
          )}
        </>
      )}
    </FullscreenLayout>
  );
}