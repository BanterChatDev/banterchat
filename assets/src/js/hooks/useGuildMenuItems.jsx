import React from 'react';
import { SettingsIcon, CopyIcon, PlusIcon, LogoutIcon } from '../components/icons';
import { t as tBare } from '../lang/apply';
import { useGuildMe } from './useGuildMe';
import { PERM_MANAGE_GUILD } from '../permissions/perms';

export function buildGuildMenuItems({ guild, user, canManage }) {
  if (!guild) return [];
  const isOwner = user && guild.owner_id === user.id;
  const items = [];

  items.push({
    key: 'invite',
    label: tBare('contextmenu.invite_people'),
    icon: <PlusIcon className="w-4 h-4" />,
    color: '#3ba55c',
    onClick: () => window.dispatchEvent(new CustomEvent('openGuildInviteModal', { detail: guild })),
  });

  items.push({
    key: 'mark-read',
    label: tBare('contextmenu.mark_server_as_read'),
    color: '#9ca3af',
    onClick: () => window.dispatchEvent(new CustomEvent('markGuildRead', { detail: { guildId: guild.id } })),
  });

  items.push({
    key: 'settings',
    label: (canManage || isOwner) ? tBare('contextmenu.server_settings') : (tBare('contextmenu.notification_settings') || 'Notification Settings'),
    icon: <SettingsIcon className="w-4 h-4" />,
    onClick: () => window.dispatchEvent(new CustomEvent('openGuildSettings', { detail: guild })),
  });

  items.push({ key: 'sep-1', separator: true });

  items.push({
    key: 'copy-id',
    label: tBare('contextmenu.copy_server_id'),
    icon: <CopyIcon className="w-4 h-4" />,
    color: '#9ca3af',
    onClick: () => navigator.clipboard.writeText(guild.id),
  });

  if (!isOwner) {
    items.push({ key: 'sep-2', separator: true });
    items.push({
      key: 'leave',
      label: tBare('contextmenu.leave_server'),
      icon: <LogoutIcon className="w-4 h-4" />,
      danger: true,
      onClick: () => {
        import('../api/guilds').then(mod => mod.apiLeaveGuild(guild.id)).catch(() => {});
      },
    });
  }

  return items;
}

export function useGuildMenuItems(guild, user) {
  const { can } = useGuildMe(guild?.id, user?.id);
  const canManage = can(PERM_MANAGE_GUILD);
  return buildGuildMenuItems({ guild, user, canManage });
}