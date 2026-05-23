import { PERM_ADMINISTRATOR, PERM_SEND_MESSAGES, PERM_MANAGE_MESSAGES, PERM_VIEW_CHANNELS, PERM_ATTACH_FILES, PERM_USE_SLASH_COMMANDS, PERM_CREATE_PUBLIC_THREADS } from './perms';
import { toBig } from './registry';

const ALL_BITS_SET = -1n;

export function hasPerm(userPerms, required) {
  const u = toBig(userPerms);
  const r = toBig(required);
  if ((u & toBig(PERM_ADMINISTRATOR)) !== 0n) return true;
  return (u & r) !== 0n;
}

export function resolvePerms(roles) {
  const sorted = [...(roles || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  let result = 0n, decided = 0n;
  for (const r of sorted) {
    const newAllow = toBig(r.permissions) & ~decided;
    const newDeny = toBig(r.deny) & ~decided;
    result |= newAllow;
    result &= ~newDeny;
    decided |= newAllow | newDeny;
  }
  return result;
}

export function resolveChannelPerms(guildMe, channel, categories) {
  if (!guildMe || !channel) return 0n;
  if (guildMe.is_owner) return ALL_BITS_SET;
  const guildPerms = toBig(guildMe.permissions);
  if ((guildPerms & toBig(PERM_ADMINISTRATOR)) !== 0n) return ALL_BITS_SET;
  const userRoleIds = (guildMe.roles || []).map(r => r.id);
  const overrides = channel.permission_overrides || [];
  if (overrides.length > 0) {
    let chAllow = 0n, chDeny = 0n;
    for (const ov of overrides) {
      if (userRoleIds.includes(ov.role_id)) {
        chAllow |= toBig(ov.allow);
        chDeny |= toBig(ov.deny);
      }
    }
    if (chAllow !== 0n || chDeny !== 0n) return (guildPerms & ~chDeny) | chAllow;
  }
  if (channel.category_id && categories) {
    const cat = categories.find(c => c.id === channel.category_id);
    if (cat) {
      const catOverrides = cat.permission_overrides || [];
      let catAllow = 0n, catDeny = 0n;
      for (const ov of catOverrides) {
        if (userRoleIds.includes(ov.role_id)) {
          catAllow |= toBig(ov.allow);
          catDeny |= toBig(ov.deny);
        }
      }
      if (catAllow !== 0n || catDeny !== 0n) return (guildPerms & ~catDeny) | catAllow;
    }
  }
  return guildPerms;
}

export function canSendInChannel(guildMe, channel, categories) {
  const perms = resolveChannelPerms(guildMe, channel, categories);
  return hasPerm(perms, PERM_SEND_MESSAGES);
}

export function canViewChannel(guildMe, channel, categories) {
  if (!channel) return true;
  const perms = resolveChannelPerms(guildMe, channel, categories);
  return hasPerm(perms, PERM_VIEW_CHANNELS);
}

export function canAttachInChannel(guildMe, channel, categories) {
  const perms = resolveChannelPerms(guildMe, channel, categories);
  return hasPerm(perms, PERM_ATTACH_FILES);
}

export function getTopRolePosition(guildMe) {
  if (!guildMe || !guildMe.roles || guildMe.roles.length === 0) return 999;
  return Math.min(...guildMe.roles.map(r => r.position ?? 999));
}

export function canUseSlashCommands(guildMe, channel, categories) {
  const perms = resolveChannelPerms(guildMe, channel, categories);
  return hasPerm(perms, PERM_USE_SLASH_COMMANDS);
}

export function canManageMessages(guildMe, channel, categories) {
  const perms = resolveChannelPerms(guildMe, channel, categories);
  return hasPerm(perms, PERM_MANAGE_MESSAGES);
}

export function canCreateThread(guildMe, channel, categories) {
  const perms = resolveChannelPerms(guildMe, channel, categories);
  return hasPerm(perms, PERM_CREATE_PUBLIC_THREADS);
}

export function permsToString(perms) {
  return toBig(perms).toString();
}

export function hasAllBits(perms) {
  return toBig(perms) === ALL_BITS_SET;
}