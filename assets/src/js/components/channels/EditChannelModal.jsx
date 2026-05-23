import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModalError } from '../ui/Modal';
import { apiUpdateChannel, apiGetChannelPerms, apiSetChannelPerm } from '../../api/channels';
import usePermOverrides from '../../hooks/usePermOverrides';
import PermissionsEditor from '../ui/PermissionsEditor';
import FullscreenLayout from '../ui/FullscreenLayout';
import { getSettingsTabs } from '../settings/settingsTabs';
import WebhooksTab from './WebhooksTab';
import { useGuildMe } from '../../hooks/useGuildMe';
import { PERM_MANAGE_WEBHOOKS } from '../../permissions/perms';
import { SettingsIcon, LockIcon, BoltIcon } from '../icons';
import { useT } from '../../hooks/useT';
import SearchableSelect from '../ui/SearchableSelect';
import { SLOWMODE_PRESETS } from './slowmodePresets';

export default function EditChannelModal({ isOpen, onClose, channel, categories, user }) {
  const t = useT();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [slowmode, setSlowmode] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const perm = usePermOverrides(apiGetChannelPerms, apiSetChannelPerm, null, channel?.guild_id);
  const guildMe = useGuildMe(channel?.guild_id, user?.id);
  const canManageWebhooks = guildMe.can ? guildMe.can(PERM_MANAGE_WEBHOOKS) : false;

  const tabs = useMemo(() => {
    const base = getSettingsTabs();
    if (canManageWebhooks) {
      return [...base, { id: 'webhooks', label: 'Webhooks', icon: <BoltIcon className="w-4 h-4" /> }];
    }
    return base;
  }, [canManageWebhooks]);

  useEffect(() => {
    if (isOpen && channel) {
      setName(channel.name || '');
      setDesc(channel.description || '');
      setCategoryId(channel.category_id || '');
      setSlowmode(channel.slowmode_seconds || 0);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
      perm.loadPerms(channel.id);
    }
  }, [isOpen, channel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError(t('common.name_validation').replace('{min}', 2).replace('{max}', 30));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiUpdateChannel(channel.id, { name: trimmed, description: desc.trim(), category_id: categoryId, slowmode_seconds: slowmode });
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const savePerms = () => perm.savePerms(channel.id);

  if (!isOpen || !channel) return null;

  return (
    <FullscreenLayout title={t('channels.edit_modal.fullscreen_title')} subtitle={`#${channel.name}`} tabs={tabs} onClose={onClose} defaultTab="general">
      {(tab) => (
        <>
          {tab === 'general' && (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="tw-card p-4 sm:p-5 space-y-4">
                  <div>
                <label className="tw-label mb-2">{t('channels.create_modal.label_name')}</label>
                <div className="flex items-center bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg overflow-hidden focus-within:border-white/20 transition-colors">
                      <span className="pl-3 text-white/20 text-sm">#</span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder={t('channels.edit_modal.placeholder_name')}
                        className="flex-1 bg-transparent px-2 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none"
                        maxLength={30}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="tw-label mb-2">{t('channels.create_modal.label_description')} <span className="text-white/15">{t('channels.create_modal.optional_suffix')}</span></label>
                    <input
                      type="text"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder={t('channels.create_modal.placeholder_description')}
                      className="w-full tw-input px-3 py-2.5"
                      maxLength={100}
                    />
                  </div>
                  {categories && categories.length > 0 && (
                    <div>
                      <label className="tw-label mb-2">{t('channels.edit_modal.label_category')}</label>
                      <SearchableSelect
                        value={categoryId}
                        onChange={(v) => setCategoryId(v)}
                        options={[{ value: '', label: t('channels.edit_modal.no_category') }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                        searchable={false}
                      />
                    </div>
                  )}
                  {channel.type !== 'voice' && (
                    <div>
                      <label className="tw-label mb-2">{t('channels.edit_modal.label_slowmode')}</label>
                      <SearchableSelect
                        value={slowmode}
                        onChange={(v) => setSlowmode(Number(v))}
                        options={SLOWMODE_PRESETS.map(p => ({ value: p.value, label: t(p.key) }))}
                        searchable={false}
                      />
                      <div className="text-[11px] text-white/35 mt-1.5">{t('channels.edit_modal.slowmode_hint')}</div>
                    </div>
                  )}
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
            <PermissionsEditor roles={perm.roles} overrides={perm.overrides} setOverrides={perm.setOverrides} permLoading={perm.permLoading} permSaving={perm.permSaving} onSave={savePerms} onClose={onClose} channelType={channel.type} />
          )}
          {tab === 'webhooks' && <WebhooksTab channelId={channel.id} />}
        </>
      )}
    </FullscreenLayout>
  );
}