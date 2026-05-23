import { registerContextMenuItems } from './ContextMenuProvider';
import { PERM_MANAGE_CHANNELS } from '../../permissions';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('channel-notif-settings',
  (e, ctx) => !!ctx?.channel && !ctx?.message && ctx.channel.type !== 'voice',
  (e, ctx) => [{
    label: tBare('contextmenu.notification_settings') || 'Notification Settings',
    action: () => {
      const ch = ctx.channel;
      const guildId = ch.guild_id;
      const targetPath = guildId ? `/channels/${guildId}/${ch.id}` : `/channels/${ch.id}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openChannelNotifPopover', { detail: { channelId: ch.id } }));
      }, 150);
    },
  }]
);

registerContextMenuItems('channel-copy-id',
  (e, ctx) => !!ctx?.channel && !ctx?.message,
  (e, ctx) => [{
    label: tBare('contextmenu.copy_channel_id'),
    color: '#6b7280',
    action: () => navigator.clipboard.writeText(ctx.channel.id),
  }]
);

registerContextMenuItems('channel-admin-actions',
  (e, ctx) => !!ctx?.channel && !ctx?.message && typeof ctx?.can === 'function' && ctx.can(PERM_MANAGE_CHANNELS),
  (e, ctx) => {
    const ch = ctx.channel;
    const items = [
      { separator: true },
      {
        label: tBare('contextmenu.edit_channel'),
        color: '#60a5fa',
        action: () => window.dispatchEvent(new CustomEvent('editChannel', { detail: ch })),
      },
      {
        label: tBare('contextmenu.duplicate_channel') || 'Duplicate Channel',
        color: '#9ca3af',
        action: () => {
          import('../../api/channels').then(mod => mod.apiDuplicateChannel(ch.id)).catch(() => {});
        },
      },
    ];
    items.push({
      label: tBare('contextmenu.delete_channel'),
      danger: true,
      action: () => {
        import('../../api/channels').then(mod => mod.apiDeleteChannel(ch.id)).catch(() => {});
      },
    });
    return items;
  }
);

registerContextMenuItems('channel-mark-read',
  (e, ctx) => !!ctx?.channel && !ctx?.message,
  (e, ctx) => [{
    separator: true,
  }, {
    label: tBare('contextmenu.mark_as_read'),
    color: '#6b7280',
    action: () => {
      import('../../api/reads').then(mod => mod.apiMarkRead(ctx.channel.id)).catch(() => {});
    },
  }]
);

registerContextMenuItems('voice-channel-actions',
  (e, ctx) => !!ctx?.channel && ctx.channel.type === 'voice' && !ctx?.message,
  (e, ctx) => {
    const ch = ctx.channel;
    const voiceState = window.__voiceState;
    const isInThis = voiceState && voiceState.channelId === ch.id;
    const isInAny = voiceState && voiceState.channelId;
    const items = [{ separator: true }];
    if (isInThis) {
      items.push({
        label: tBare('voice.controls.disconnect'),
        danger: true,
        action: () => { if (voiceState.leave) voiceState.leave(); },
      });
    } else {
      items.push({
        label: tBare('contextmenu.join_voice_channel'),
        color: '#3ba55c',
        action: () => { if (voiceState && voiceState.join) voiceState.join(ch.id, ch.guild_id || null); },
      });
    }
    return items;
  }
);