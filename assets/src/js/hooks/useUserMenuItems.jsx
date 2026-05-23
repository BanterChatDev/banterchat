import React from 'react';
import { t as tBare } from '../lang/apply';
import { hasPerm, PERM_BAN_MEMBERS, PERM_KICK_MEMBERS, PERM_ADMINISTRATOR } from '../permissions';
import { useBlocks } from './useBlocks';

function notifyError(err) {
  if (!err) return;
  import('../components/notification/Notifications.jsx').then(m => m.notify(err.message || String(err), 'error')).catch(() => {});
}

export function buildUserMenuItems({ targetUser, currentUser, guild, guildMe, isBlocked, includeMessage = true }) {
  if (!targetUser || !currentUser) return [];
  if (currentUser.id === targetUser.id) {
    return [{
      key: 'copy-id',
      label: tBare('contextmenu.copy_user_id'),
      color: '#6b7280',
      onClick: () => navigator.clipboard.writeText(targetUser.id),
    }];
  }
  const items = [];

  if (includeMessage) {
    items.push({
      key: 'message',
      label: tBare('contextmenu.user_message'),
      onClick: () => {
        window.history.pushState({}, '', `/messages/${currentUser.id}/${targetUser.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
    });
  }

  items.push({
    key: 'copy-id',
    label: tBare('contextmenu.copy_user_id'),
    color: '#6b7280',
    onClick: () => navigator.clipboard.writeText(targetUser.id),
  });

  if (targetUser.username) {
    items.push({ key: 'sep-block', separator: true });
    if (isBlocked) {
      items.push({
        key: 'unblock',
        label: tBare('user.profile_modal.unblock'),
        onClick: () => {
          import('../api/blocks').then(m => m.apiUnblockUser(targetUser.username)).catch(notifyError);
        },
      });
    } else {
      items.push({
        key: 'block',
        label: tBare('user.profile_modal.block'),
        danger: true,
        onClick: () => {
          import('../api/blocks').then(m => m.apiBlockUser(targetUser.username)).catch(notifyError);
        },
      });
    }
  }

  const guildPerms = guildMe?.permissions || 0;
  const canKick = !!guildMe && (guildMe.is_owner || hasPerm(guildPerms, PERM_KICK_MEMBERS) || hasPerm(guildPerms, PERM_ADMINISTRATOR));
  const canBan = !!guildMe && (guildMe.is_owner || hasPerm(guildPerms, PERM_BAN_MEMBERS) || hasPerm(guildPerms, PERM_ADMINISTRATOR));

  if (canKick && guildMe?.guild_id) {
    items.push({ key: 'sep-mod', separator: true });
    items.push({
      key: 'kick',
      label: tBare('contextmenu.kick_from_server'),
      danger: true,
      onClick: () => {
        import('../api/guilds').then(m => m.apiKickGuildMember(guildMe.guild_id, targetUser.id)).catch(notifyError);
      },
    });
  }
  if (canBan && guildMe?.guild_id) {
    items.push({
      key: 'ban',
      label: tBare('contextmenu.ban_from_server'),
      danger: true,
      onClick: () => {
        import('../api/guilds').then(m => m.apiBanGuildMember(guildMe.guild_id, targetUser.id)).catch(notifyError);
      },
    });
  }

  items.push({ key: 'sep-report', separator: true });
  items.push({
    key: 'report',
    label: tBare('contextmenu.report_user'),
    color: '#f87171',
    onClick: () => window.dispatchEvent(new CustomEvent('openReportModal', {
      detail: { targetType: 'user', targetId: targetUser.id, targetLabel: targetUser.username },
    })),
  });

  if (currentUser?.is_site_admin) {
    items.push({
      key: 'site-ban',
      label: tBare('contextmenu.terminate_user'),
      danger: true,
      onClick: () => {
        import('../api/users').then(m => m.apiTerminateUser(targetUser.id)).catch(notifyError);
      },
    });
  }

  if (guild && guildMe?.is_owner && !targetUser.is_bot) {
    items.push({ key: 'sep-transfer', separator: true });
    items.push({
      key: 'transfer',
      label: tBare('contextmenu.transfer_ownership'),
      color: '#fbbf24',
      onClick: () => window.dispatchEvent(new CustomEvent('openTransferOwnership', {
        detail: { guild, targetUser },
      })),
    });
  }

  return items;
}

export function useUserMenuItems({ targetUser, currentUser, guild, guildMe, includeMessage = true }) {
  const { isBlocked: isBlockedFn } = useBlocks();
  const isBlocked = targetUser ? isBlockedFn(targetUser.id) : false;
  return buildUserMenuItems({ targetUser, currentUser, guild, guildMe, isBlocked, includeMessage });
}