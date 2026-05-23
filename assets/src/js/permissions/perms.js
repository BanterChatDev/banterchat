import { registerPerm } from './registry';

const chan = { channelLevel: true };
const voice = { channelLevel: true, voiceOnly: true };
const B = (n) => 1n << BigInt(n);

export const PERM_SEND_MESSAGES          = registerPerm('send_messages',          B(0),  'Send Messages',          'Send messages in channels',                                                        chan);
export const PERM_MANAGE_CHANNELS        = registerPerm('manage_channels',        B(1),  'Manage Channels',        'Create, edit, and delete channels');
export const PERM_MANAGE_ROLES           = registerPerm('manage_roles',           B(2),  'Manage Roles',           'Create, edit, delete roles and assign them to members');
export const PERM_MANAGE_MESSAGES        = registerPerm('manage_messages',        B(3),  'Manage Messages',        "Delete any user's messages",                                                       chan);
export const PERM_ADMINISTRATOR          = registerPerm('administrator',          B(4),  'Administrator',          'Full access — bypasses all permission checks');
export const PERM_MENTION_EVERYONE       = registerPerm('mention_everyone',       B(5),  'Mention Everyone',       'Use @everyone, @here, and all roles to notify users',                              chan);
export const PERM_VIEW_CHANNELS          = registerPerm('view_channels',          B(6),  'View Channels',          'View a channel and read its messages',                                             chan);
export const PERM_ATTACH_FILES           = registerPerm('attach_files',           B(7),  'Attach Files',           'Upload file attachments to messages',                                              chan);
export const PERM_BAN_MEMBERS            = registerPerm('ban_members',            B(8),  'Ban Members',            'Permanently ban members from the server');
export const PERM_USE_SLASH_COMMANDS     = registerPerm('use_slash_commands',     B(9),  'Use Slash Commands',     'Use slash commands in channels',                                                   chan);
export const PERM_MANAGE_GUILD           = registerPerm('manage_guild',           B(10), 'Manage Server',          'Edit server name, icon, region, and overview settings');
export const PERM_KICK_MEMBERS           = registerPerm('kick_members',           B(11), 'Kick Members',           'Remove members from the server (they can rejoin via invite)');
export const PERM_EMBED_LINKS            = registerPerm('embed_links',            B(12), 'Embed Links',            'Posted links auto-expand into rich embeds',                                        chan);
export const PERM_ADD_REACTIONS          = registerPerm('add_reactions',          B(13), 'Add Reactions',          'Add new reactions to messages',                                                    chan);
export const PERM_CREATE_PUBLIC_THREADS  = registerPerm('create_public_threads',  B(14), 'Create Public Threads',  'Create threads visible to anyone with channel access',                             chan);
export const PERM_CREATE_PRIVATE_THREADS = registerPerm('create_private_threads', B(15), 'Create Private Threads', 'Create threads only invited members can see',                                      chan);
export const PERM_SEND_IN_THREADS        = registerPerm('send_in_threads',        B(16), 'Send Messages in Threads', 'Send messages inside threads',                                                  chan);
export const PERM_MANAGE_WEBHOOKS        = registerPerm('manage_webhooks',        B(17), 'Manage Webhooks',        'Create, edit, and delete webhooks for channels',                                   chan);
export const PERM_VIEW_AUDIT_LOG         = registerPerm('view_audit_log',         B(18), 'View Audit Log',         'View the audit log of moderation and configuration actions');
export const PERM_MANAGE_VANITY          = registerPerm('manage_vanity',          B(19), 'Manage Vanity URL',      "Set, change, and remove the server's vanity URL");