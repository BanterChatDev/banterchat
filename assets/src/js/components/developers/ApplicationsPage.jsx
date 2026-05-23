import React, { useState, useEffect, useRef } from 'react';
import FullscreenLayout from '../ui/FullscreenLayout';
import Spinner from '../ui/Spinner';
import Alert from '../ui/Alert';
import AppListView from './AppListView';
import OAuth2Tab from './OAuth2Tab';
import DangerZoneTab from './DangerZoneTab';
import CommandsTab from './CommandsTab';
import UserAvatar from '../user/UserAvatar';
import { formatDate } from '../user/UserInfo';
import AvatarUpload from '../ui/AvatarUpload';
import { useImageUpload } from '../../hooks/useImageUpload';
import { getApp, updateApp, uploadAppAvatar, deleteAppAvatar, uploadAppBanner, deleteAppBanner } from '../../api/developers';
import { u } from '../../api/routes';
import { HomeIcon, ShieldIcon, TrashIcon, ArrowLeftIcon, BoltIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';

const MAX_DESC = 400;
const MAX_NAME = 32;

export default function ApplicationsPage({ navigate }) {
  const t = useT();
  const [openAppID, setOpenAppID] = useState(null);
  const [openApp, setOpenApp] = useState(null);
  const [loadingApp, setLoadingApp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!openAppID) {
      setOpenApp(null);
      return;
    }
    setLoadingApp(true);
    setError('');
    getApp(openAppID)
      .then(d => setOpenApp(d.application || d))
      .catch(e => setError(e.message))
      .finally(() => setLoadingApp(false));
  }, [openAppID]);

  const handleClose = () => navigate(ROUTES.channels);

  if (!openAppID) {
    return (
      <FullscreenLayout
        title={t('developers.page_title')}
        subtitle={t('developers.tab_applications')}
        tabs={[{ id: 'apps', label: t('developers.tab_applications'), icon: <HomeIcon className="w-4 h-4" /> }]}
        onClose={handleClose}
        defaultTab="apps"
      >
        {() => <AppListView onOpen={setOpenAppID} />}
      </FullscreenLayout>
    );
  }

  const tabs = [
    { id: 'general', label: t('developers.tab_general'), icon: <HomeIcon className="w-4 h-4" /> },
    { id: 'commands', label: t('developers.tab_commands'), icon: <BoltIcon className="w-4 h-4" /> },
    { id: 'oauth2', label: t('developers.tab_oauth2'), icon: <ShieldIcon className="w-4 h-4" /> },
    { id: 'danger', label: t('developers.tab_danger'), icon: <TrashIcon className="w-4 h-4" /> },
  ];

  const sidebarHeader = (
    <div className="min-w-0 flex items-center gap-2">
      <button
        onClick={() => setOpenAppID(null)}
        className="p-1 rounded hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
        title={t('developers.back_to_list_title')}
      >
        <ArrowLeftIcon className="w-4 h-4" />
      </button>
      <div className="min-w-0">
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{t('developers.sidebar_application')}</span>
        <p className="text-xs text-white/80 mt-0.5 truncate font-medium">{openApp?.name || '…'}</p>
      </div>
    </div>
  );

  return (
    <FullscreenLayout
      key={openAppID}
      title={t('developers.page_title')}
      tabs={tabs}
      onClose={handleClose}
      defaultTab="general"
      sidebarHeader={sidebarHeader}
    >
      {(tab) => {
        if (loadingApp) return <div className="py-12 flex justify-center"><Spinner /></div>;
        if (error) return <div className="max-w-lg mx-auto"><Alert>{error}</Alert></div>;
        if (!openApp) return null;
        if (tab === 'general') return <AppGeneralTab app={openApp} onUpdated={setOpenApp} />;
        if (tab === 'commands') return <CommandsTab app={openApp} />;
        if (tab === 'oauth2') return <OAuth2Tab app={openApp} />;
        if (tab === 'danger') return <DangerZoneTab app={openApp} onDeleted={() => setOpenAppID(null)} />;
        return null;
      }}
    </FullscreenLayout>
  );
}

const INPUT_CLS = 'w-full bg-[var(--bg-input)] border border-[var(--border-medium)] focus:border-[var(--border-focus)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder-white/30 outline-none transition-colors';

function Field({ label, hint, value, onChange, max, validate, multiline, rows = 3, placeholder }) {
  const valid = validate ? validate(value) : true;
  const len = multiline ? value.length : [...value].length;
  return (
    <div>
      <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} maxLength={max} rows={rows} placeholder={placeholder}
          className={`${INPUT_CLS} resize-y leading-relaxed`} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} maxLength={max} placeholder={placeholder} className={INPUT_CLS} />
      )}
      <div className="flex justify-between mt-1">
        <span className={`text-[11px] ${valid ? 'text-white/30' : 'text-[var(--accent-danger)]'}`}>{hint}</span>
        {max != null && <span className={`text-[11px] font-mono ${valid ? 'text-white/25' : 'text-[var(--accent-danger)]'}`}>{len}/{max}</span>}
      </div>
    </div>
  );
}

function AppGeneralTab({ app, onUpdated }) {
  const t = useT();
  const [name, setName] = useState(app.name || '');
  const [description, setDescription] = useState(app.description || '');
  const [displayName, setDisplayName] = useState(app.display_name || '');
  const [bio, setBio] = useState(app.bio || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const initialRef = useRef({ name: app.name || '', description: app.description || '', display_name: app.display_name || '', bio: app.bio || '' });

  useEffect(() => {
    setName(app.name || '');
    setDescription(app.description || '');
    setDisplayName(app.display_name || '');
    setBio(app.bio || '');
    initialRef.current = { name: app.name || '', description: app.description || '', display_name: app.display_name || '', bio: app.bio || '' };
  }, [app.id]);

  const avatar = useImageUpload({
    maxSize: 5 * 1024 * 1024,
    aspect: 1,
    applyCrop: true,
    cropTargetLongEdge: 512,
    upload: (file) => uploadAppAvatar(app.id, file),
    remove: () => deleteAppAvatar(app.id),
    onUpload: (res) => onUpdated?.({ ...app, avatar_id: res.avatar_id }),
    onRemove: () => onUpdated?.({ ...app, avatar_id: '' }),
  });

  const banner = useImageUpload({
    maxSize: 6 * 1024 * 1024,
    aspect: 3,
    upload: (file, crop) => uploadAppBanner(app.id, file, crop),
    remove: () => deleteAppBanner(app.id),
    onUpload: (res) => onUpdated?.({ ...app, banner_id: res.banner_id }),
    onRemove: () => onUpdated?.({ ...app, banner_id: '' }),
  });

  const trimmedName = name.trim();
  const trimmedDN = displayName.trim();
  const trimmedBio = bio.trim();
  const validName = (v) => { const n = v.trim().length; return n >= 2 && n <= MAX_NAME; };
  const validDesc = (v) => v.length <= MAX_DESC;
  const validDN = (v) => [...v.trim()].length <= 32;
  const validBio = (v) => v.length <= 190;
  const dirty = trimmedName !== initialRef.current.name || description !== initialRef.current.description || trimmedDN !== initialRef.current.display_name || trimmedBio !== initialRef.current.bio;
  const canSave = dirty && validName(name) && validDesc(description) && validDN(displayName) && validBio(bio) && !saving;

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    setSaveErr('');
    try {
      const updated = await updateApp(app.id, { name: trimmedName, description, display_name: trimmedDN, bio: trimmedBio });
      const next = updated?.application || updated;
      if (next && next.id) {
        onUpdated?.(next);
        initialRef.current = { name: next.name || '', description: next.description || '', display_name: next.display_name || '', bio: next.bio || '' };
        setSaveMsg(t('developers.save_success'));
        setTimeout(() => setSaveMsg(''), 1500);
      }
    } catch (e) {
      setSaveErr(e.message || t('developers.save_error_fallback'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
        {app.name}
        {app.discriminator && <span className="text-white/35 font-normal ml-1">#{app.discriminator}</span>}
      </h2>
      <p className="text-xs text-white/40 mb-6">{t('developers.general_subtitle')}</p>

      <div className="mb-6 p-4 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-lg space-y-5">
        <div>
          <span className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">{t('developers.section_avatar')}</span>
          <div className="flex items-center gap-4">
            <div className="rounded-full p-0.5 bg-white/[0.06] inline-block">
              <AvatarUpload img={avatar} hasImage={!!app.avatar_id}
                previewEl={<UserAvatar username={app.name} avatarId={app.avatar_id} userId={app.bot_user_id} size="xl" />} />
            </div>
            <div className="text-[11px] text-white/30 leading-relaxed">
              <p>{t('profile.hint.avatar_formats')}</p>
              <p>{t('profile.hint.avatar_max_size')}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-5">
          <span className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">{t('developers.section_banner')}</span>
          <AvatarUpload img={banner} hasImage={!!app.banner_id} wrapperClass="rounded-2xl w-full"
            previewEl={app.banner_id ? (
              <img src={u.banner(app.banner_id)} alt="" className="w-full h-32 rounded-2xl object-cover" />
            ) : (
              <div className="w-full h-32 rounded-2xl bg-white/[0.04]" />
            )} />
          <p className="text-[11px] text-white/20 mt-2">{t('profile.hint.banner_dimensions')}</p>
        </div>
      </div>

      <div className="space-y-5">
        <Field label={t('developers.label_name')} value={name} onChange={setName} max={MAX_NAME} validate={validName}
          hint={validName(name) ? t('developers.name_valid_hint') : t('developers.name_invalid_hint')}
          placeholder={t('developers.placeholder_name')} />
        <Field label={t('developers.label_display_name')} value={displayName} onChange={setDisplayName} max={32} validate={validDN}
          hint={t('developers.display_name_hint')} placeholder={t('developers.placeholder_display_name')} />
        <Field label={t('developers.label_bio')} value={bio} onChange={setBio} max={190} validate={validBio} multiline rows={3}
          hint={t('developers.bio_hint')} placeholder={t('developers.placeholder_bio')} />
        <Field label={t('developers.label_description')} value={description} onChange={setDescription} max={MAX_DESC} validate={validDesc} multiline rows={4}
          hint={t('developers.description_hint')} placeholder={t('developers.placeholder_description')} />

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={!canSave}
            className="px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-white/[0.06] disabled:text-white/30 text-white text-sm font-medium transition-colors">
            {saving ? t('common.saving') : t('developers.btn_save_changes')}
          </button>
          {saveMsg && <span className="text-xs text-[var(--accent-success)]">{saveMsg}</span>}
          {saveErr && <span className="text-xs text-[var(--accent-danger)]">{saveErr}</span>}
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--border-default)]">
        <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3">{t('developers.identifiers_heading')}</h3>
        <div className="space-y-2">
          <InfoRow label={t('developers.id_application')} value={app.id} mono />
          <InfoRow label={t('developers.id_bot_user')} value={app.bot_user_id} mono />
          <InfoRow label={t('developers.id_owner')} value={app.owner_id} mono />
          <InfoRow label={t('developers.id_created')} value={app.created_at ? formatDate(app.created_at) : ''} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-start gap-4 py-1">
      <div className="w-32 shrink-0 text-[11px] font-semibold text-white/40 uppercase tracking-wider pt-0.5">{label}</div>
      <div className={`min-w-0 flex-1 text-xs text-white/70 break-all ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}