import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiUpdateGuild, apiDeleteGuild, apiLeaveGuild, apiUploadGuildIcon, apiDeleteGuildIcon, apiUploadGuildBanner, apiDeleteGuildBanner, apiGuildAuditLog } from '../../api/guilds';
import { u } from '../../api/routes';
import { useGuildChannels } from '../../hooks/useGuildChannels';
import { SettingsIcon, ShieldIcon, UserIcon, CloseIcon, ExternalLinkIcon as LinkIcon, HashIcon, LockIcon, BellIcon, DocumentIcon, EmojiIcon } from '../icons';
import InvitesTab from './InvitesTab';
import RolesTab from '../settings/RolesTab';
import MembersTab from '../settings/MembersTab';
import GuildBansTab from '../settings/GuildBansTab';
import DiscoveryTab from '../discovery/DiscoveryTab';
import VanityTab from './VanityTab';
import GuildNotificationsTab from './GuildNotificationsTab';
import { AuditLogList, GUILD_ACTION_FILTERS } from '../auditlog';
import GuildNicknameTab from './GuildNicknameTab';
import EmojisTab from '../settings/EmojisTab';
import AvatarUpload from '../ui/AvatarUpload';
import FullscreenLayout from '../ui/FullscreenLayout';
import SearchableSelect from '../ui/SearchableSelect';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useGuildMe } from '../../hooks/useGuildMe';
import { PERM_MANAGE_CHANNELS, PERM_MANAGE_ROLES, PERM_BAN_MEMBERS, PERM_MANAGE_GUILD, PERM_MANAGE_VANITY, PERM_VIEW_AUDIT_LOG } from '../../permissions/perms';
import { useT } from '../../hooks/useT';

function GuildIconBlock({ guild, disabled, onUpdated }) {
  const initials = (guild?.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hasIcon = !!guild?.icon;

  const img = useImageUpload({
    maxSize: 4 * 1024 * 1024,
    aspect: 1,
    applyCrop: true,
    cropTargetLongEdge: 512,
    upload: (file) => apiUploadGuildIcon(guild.id, file),
    remove: () => apiDeleteGuildIcon(guild.id),
    onUpload: (res) => onUpdated?.({ ...guild, icon: res.icon }),
    onRemove: () => onUpdated?.({ ...guild, icon: '' }),
  });

  const previewEl = (
    <div className="w-20 h-20 rounded-[20px] bg-[var(--accent)] flex items-center justify-center overflow-hidden">
      {hasIcon ? (
        <img src={u.guildAvatar(guild.icon)} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-2xl font-bold text-white select-none">{initials}</span>
      )}
    </div>
  );

  return <AvatarUpload img={img} hasImage={hasIcon} previewEl={previewEl} wrapperClass="rounded-[20px]" disabled={disabled} />;
}

function GuildBannerBlock({ guild, disabled, onUpdated }) {
  const t = useT();
  const hasBanner = !!guild?.banner;

  const img = useImageUpload({
    maxSize: 6 * 1024 * 1024,
    aspect: 16 / 9,
    upload: (file, crop) => apiUploadGuildBanner(guild.id, file, crop),
    remove: () => apiDeleteGuildBanner(guild.id),
    onUpload: (res) => onUpdated?.({ ...guild, banner: res.banner, banner_crop: res.banner_crop }),
    onRemove: () => onUpdated?.({ ...guild, banner: '', banner_crop: '' }),
  });

  const previewEl = (
    <div className="w-full h-32 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] overflow-hidden flex items-center justify-center">
      {hasBanner ? (
        <img src={u.guildBanner(guild.banner)} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs text-white/25 select-none">{t('guilds.settings_overview_no_banner')}</span>
      )}
    </div>
  );

  return <AvatarUpload img={img} hasImage={hasBanner} previewEl={previewEl} wrapperClass="rounded-lg w-full" disabled={disabled} />;
}

function OverviewTab({ guild, can, onUpdated }) {
  const t = useT();
  const [name, setName] = useState(guild?.name || '');
  const [desc, setDesc] = useState(guild?.description || '');
  const [welcomeCh, setWelcomeCh] = useState(guild?.welcome_channel_id || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canManage = can(PERM_MANAGE_GUILD);
  const { channels: allChannels } = useGuildChannels(canManage ? guild?.id : null);
  const channels = useMemo(
    () => (allChannels || []).filter(c => c.type === 'text'),
    [allChannels]
  );

  useEffect(() => {
    setName(guild?.name || '');
    setDesc(guild?.description || '');
    setWelcomeCh(guild?.welcome_channel_id || '');
  }, [guild?.id, guild?.welcome_channel_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiUpdateGuild(guild.id, {
        name: name.trim(),
        description: desc.trim(),
        welcome_channel_id: welcomeCh,
      });
      onUpdated?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-white/80 mb-4">{t('guilds.settings_overview_heading')}</h3>

      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-wide text-white/35 font-semibold mb-2">{t('profile.preview_card.banner_alt')}</p>
        <GuildBannerBlock guild={guild} disabled={!canManage} onUpdated={onUpdated} />
        {canManage && <p className="text-[11px] text-white/25 mt-2">{t('guilds.settings_overview_banner_help')}</p>}
      </div>

      <div className="flex items-start gap-5 mb-6">
        <GuildIconBlock guild={guild} disabled={!canManage} onUpdated={onUpdated} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-white/35 font-semibold mb-2">{t('guilds.settings_overview_server_info')}</p>
          <p className="text-sm text-white/80 font-medium">{guild?.name}</p>
          <p className="text-xs text-white/20 mt-1">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {t('guilds.settings_overview_online_template').replace('{n}', guild?.online_count || 0)}
            </span>
            <span className="mx-2">·</span>
            {t('guilds.card_members_template').replace('{n}', guild?.member_count || 0)}
            <span className="mx-2">·</span>
            {t('guilds.settings_overview_created_template').replace('{date}', new Date(guild?.created_at).toLocaleDateString())}
          </p>
          {canManage && (
            <p className="text-[11px] text-white/25 mt-3">{t('guilds.settings_overview_icon_help')}</p>
          )}
        </div>
      </div>

      {canManage ? (
        <div className="space-y-4">
          <div>
            <label className="tw-label mb-1.5">{t('guilds.settings_overview_label_name')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="tw-input w-full px-3 py-2 rounded-md text-sm" maxLength={100} />
          </div>
          <div>
            <label className="tw-label mb-1.5">{t('developers.label_description')}</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="tw-input w-full px-3 py-2 rounded-md text-sm resize-none" placeholder={t('guilds.settings_overview_placeholder_description')} maxLength={500} />
          </div>
          <div>
            <label className="tw-label mb-1.5">{t('guilds.settings_overview_label_welcome')}</label>
            <SearchableSelect
              value={welcomeCh}
              onChange={(v) => setWelcomeCh(v)}
              options={channels}
              getKey={(c) => c.id}
              getLabel={(c) => `#${c.name}`}
              placeholder={t('guilds.settings_overview_welcome_placeholder')}
              emptyText={t('guilds.settings_overview_welcome_empty')}
              searchable={false}
              clearable
            />
            <p className="text-[11px] text-white/25 mt-1.5">{t('guilds.settings_overview_welcome_help')}</p>
          </div>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="tw-btn-accent px-5 rounded-md disabled:opacity-50">
            {saving ? t('common.saving') : saved ? t('discovery.btn_saved') : t('common.save_changes')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="tw-label">{t('developers.label_description')}</p>
          <p className="text-sm text-white/50">{guild?.description || t('guilds.settings_overview_no_description')}</p>
        </div>
      )}
    </div>
  );
}

function DangerTab({ guild, onDeleted, onClose }) {
  const t = useT();
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    try {
      await apiDeleteGuild(guild.id);
      onDeleted?.(guild.id);
      onClose();
    } catch {}
  };

  return (
    <div className="p-6 max-w-md">
      <h3 className="text-sm font-semibold text-red-400 mb-2">{t('guilds.settings_danger_heading')}</h3>
      <p className="text-xs text-white/40 mb-4">
        {t('guilds.settings_danger_body_prefix')}<span className="font-mono text-white/60">{guild?.name}</span>{t('guilds.settings_danger_body_suffix')}
      </p>
      <input
        autoFocus
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="tw-input w-full px-3 py-2 rounded-md text-sm mb-4"
        placeholder={guild?.name}
      />
      <button
        onClick={handleDelete}
        disabled={confirmText !== guild?.name}
        className="w-full tw-btn-danger rounded-md disabled:opacity-40"
      >
        {t('guilds.settings_danger_btn')}
      </button>
    </div>
  );
}

function buildTabs({ isOwner, can, t }) {
  const tabs = [];
  if (can(PERM_MANAGE_GUILD)) {
    tabs.push({ id: 'overview', label: t('guilds.settings_tab_overview'), icon: <SettingsIcon className="w-4 h-4" /> });
  }
  if (can(PERM_MANAGE_CHANNELS)) {
    tabs.push({ id: 'invites', label: t('guilds.settings_tab_invites'), icon: <LinkIcon className="w-4 h-4" /> });
  }
  if (can(PERM_MANAGE_GUILD)) {
    tabs.push({ id: 'discovery', label: t('guilds.settings_tab_discovery'), icon: <HashIcon className="w-4 h-4" /> });
  }
  tabs.push({ id: 'nickname', label: t('guilds.settings_tab_nickname'), icon: <UserIcon className="w-4 h-4" /> });
  tabs.push({ id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> });
  if (can(PERM_MANAGE_VANITY)) {
    tabs.push({ id: 'vanity', label: 'Vanity URL', icon: <LockIcon className="w-4 h-4" /> });
  }
  if (can(PERM_MANAGE_ROLES)) {
    tabs.push({ id: 'roles', label: t('ui.role_sidebar_default_header'), icon: <ShieldIcon className="w-4 h-4" />, flush: true });
  }
  if (can(PERM_MANAGE_GUILD)) {
    tabs.push({ id: 'emojis', label: t('emoji_settings.tab_label'), icon: <EmojiIcon className="w-4 h-4" />, flush: true });
  }
  if (can(PERM_BAN_MEMBERS)) {
    tabs.push({ id: 'members', label: t('channels.view.members_title'), icon: <UserIcon className="w-4 h-4" />, flush: true });
    tabs.push({ id: 'bans', label: t('settings_bans.tab_label'), icon: <CloseIcon className="w-4 h-4" />, flush: true });
  }
  if (can(PERM_VIEW_AUDIT_LOG)) {
    tabs.push({ id: 'audit_log', label: t('guilds.settings_tab_audit_log'), icon: <DocumentIcon className="w-4 h-4" />, flush: true });
  }
  if (isOwner) {
    tabs.push({ id: 'danger', label: t('guilds.settings_tab_delete'), icon: <CloseIcon className="w-4 h-4" />, owner: true });
  }
  return tabs;
}

export default function GuildSettingsModal({ isOpen, onClose, guild, user, onUpdated, onDeleted, onLeft, defaultTab }) {
  const t = useT();
  const guildMe = useGuildMe(guild?.id, user?.id);
  const isOwner = guild?.owner_id === user?.id;
  const tabs = React.useMemo(
    () => guildMe.data ? buildTabs({ isOwner, can: guildMe.can, t }) : buildTabs({ isOwner, can: () => false, t }),
    [isOwner, guildMe.data, t]
  );

  if (!isOpen || !guild) return null;
  if (!guildMe.data) return null;

  const initials = (guild.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const sidebarHeader = (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {guild.icon ? (
          <img src={u.guildAvatar(guild.icon)} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-white select-none">{initials}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/70 font-semibold truncate">{guild.name}</p>
        <p className="text-[10px] text-white/30">{t('guilds.settings_sidebar_subtitle')}</p>
      </div>
    </div>
  );

  const sidebarFooter = !isOwner ? (
    <div className="hidden sm:block p-2 border-t border-white/[0.04]">
      <button
        onClick={async () => {
          try {
            await apiLeaveGuild(guild.id);
            onLeft?.(guild.id);
            onClose();
          } catch {}
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
      >
        <CloseIcon className="w-4 h-4" />
        {t('contextmenu.leave_server')}
      </button>
    </div>
  ) : null;

  return (
    <FullscreenLayout
      title={t('guilds.settings_outer_title')}
      tabs={tabs}
      onClose={onClose}
      defaultTab={tabs.some(x => x.id === defaultTab) ? defaultTab : (tabs[0]?.id || 'notifications')}
      sidebarHeader={sidebarHeader}
      sidebarFooter={sidebarFooter}
    >
      {(activeTab) => (
        <>
          {activeTab === 'overview' && <OverviewTab guild={guild} can={guildMe.can || (() => false)} onUpdated={onUpdated} />}
          {activeTab === 'invites' && <InvitesTab guildId={guild.id} />}
          {activeTab === 'discovery' && <DiscoveryTab guild={guild} />}
          {activeTab === 'vanity' && <VanityTab guildId={guild.id} canManage={guildMe.can ? guildMe.can(PERM_MANAGE_VANITY) : false} />}
          {activeTab === 'nickname' && <GuildNicknameTab guildId={guild.id} />}
          {activeTab === 'notifications' && <GuildNotificationsTab guildId={guild.id} guildName={guild.name} />}
          {activeTab === 'roles' && <RolesTab user={user} guildId={guild.id} />}
          {activeTab === 'emojis' && <EmojisTab guildId={guild.id} />}
          {activeTab === 'members' && <MembersTab user={user} guildId={guild.id} guild={guild} />}
          {activeTab === 'bans' && <GuildBansTab guildId={guild.id} canBan={guildMe.can ? guildMe.can(PERM_BAN_MEMBERS) : false} />}
          {activeTab === 'audit_log' && (
            <AuditLogList
              title={t('auditlog.heading')}
              fetchPage={({ offset, limit, action, actorId, targetId }) => apiGuildAuditLog(guild.id, { offset, limit, action, actorId, targetId })}
              actionFilters={GUILD_ACTION_FILTERS}
            />
          )}
          {activeTab === 'danger' && <DangerTab guild={guild} onDeleted={onDeleted} onClose={onClose} />}
        </>
      )}
    </FullscreenLayout>
  );
}