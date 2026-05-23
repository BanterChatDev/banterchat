import { t } from '../../lang/apply';

export const TEMPLATE_FALLBACK = 'auditlog.tpl.fallback';

const TEMPLATES = {
  'user.ban':            'auditlog.tpl.user_ban',
  'user.unban':          'auditlog.tpl.user_unban',
  'user.delete':         'auditlog.tpl.user_delete',
  'user.suspend':        'auditlog.tpl.user_suspend',
  'user.unsuspend':      'auditlog.tpl.user_unsuspend',
  'user.warn':           'auditlog.tpl.user_warn',
  'user.promote':        'auditlog.tpl.user_promote',
  'user.demote':         'auditlog.tpl.user_demote',
  'user.force_logout':   'auditlog.tpl.user_force_logout',
  'user.kick':           'auditlog.tpl.user_kick',
  'user.timeout':        'auditlog.tpl.user_timeout',
  'user.nick_change':    'auditlog.tpl.user_nick_change',

  'guild.suspend':            'auditlog.tpl.guild_suspend',
  'guild.unsuspend':          'auditlog.tpl.guild_unsuspend',
  'guild.terminate':          'auditlog.tpl.guild_terminate',
  'guild.settings_update':    'auditlog.tpl.guild_settings_update',
  'guild.vanity_set':         'auditlog.tpl.guild_vanity_set',
  'guild.vanity_remove':      'auditlog.tpl.guild_vanity_remove',
  'guild.vanity_force_clear': 'auditlog.tpl.guild_vanity_force_clear',
  'guild.owner_transfer':     'auditlog.tpl.guild_owner_transfer',
  'guild.ban_add':            'auditlog.tpl.guild_ban_add',
  'guild.ban_remove':         'auditlog.tpl.guild_ban_remove',

  'channel.create':            'auditlog.tpl.channel_create',
  'channel.update':            'auditlog.tpl.channel_update',
  'channel.delete':            'auditlog.tpl.channel_delete',
  'channel.permission_update': 'auditlog.tpl.channel_permission_update',

  'category.create': 'auditlog.tpl.category_create',
  'category.update': 'auditlog.tpl.category_update',
  'category.delete': 'auditlog.tpl.category_delete',

  'member.kick':        'auditlog.tpl.member_kick',
  'member.role_add':    'auditlog.tpl.member_role_add',
  'member.role_remove': 'auditlog.tpl.member_role_remove',

  'thread.create':    'auditlog.tpl.thread_create',
  'thread.archive':   'auditlog.tpl.thread_archive',
  'thread.unarchive': 'auditlog.tpl.thread_unarchive',
  'thread.delete':    'auditlog.tpl.thread_delete',

  'role.create': 'auditlog.tpl.role_create',
  'role.update': 'auditlog.tpl.role_update',
  'role.delete': 'auditlog.tpl.role_delete',

  'webhook.create': 'auditlog.tpl.webhook_create',
  'webhook.update': 'auditlog.tpl.webhook_update',
  'webhook.delete': 'auditlog.tpl.webhook_delete',

  'message.delete': 'auditlog.tpl.message_delete',
  'message.purge':  'auditlog.tpl.message_purge',

  'vanity.reserve': 'auditlog.tpl.vanity_reserve',

  'report.resolve': 'auditlog.tpl.report_resolve',
};

export function templateKeyForAction(action) {
  return TEMPLATES[action] || TEMPLATE_FALLBACK;
}

export function actionLabel(action) {
  const key = 'auditlog.action_label.' + action.replace(/\./g, '_');
  const v = t(key);
  return v === key ? action : v;
}

export const GLOBAL_ACTION_FILTERS = [
  '',
  'user.ban', 'user.unban', 'user.delete', 'user.suspend', 'user.unsuspend',
  'user.warn', 'user.promote', 'user.demote', 'user.force_logout',
  'guild.terminate', 'guild.suspend', 'guild.unsuspend',
  'guild.vanity_force_clear', 'vanity.reserve',
  'report.resolve',
];

export const GUILD_ACTION_FILTERS = [
  '',
  'channel.create', 'channel.update', 'channel.delete',
  'category.create', 'category.update', 'category.delete',
  'role.create', 'role.update', 'role.delete',
  'thread.create', 'thread.delete',
  'guild.settings_update', 'guild.owner_transfer',
  'guild.vanity_set', 'guild.vanity_remove',
  'guild.ban_add', 'guild.ban_remove',
  'member.kick', 'member.role_add', 'member.role_remove',
  'webhook.create', 'webhook.update', 'webhook.delete',
];