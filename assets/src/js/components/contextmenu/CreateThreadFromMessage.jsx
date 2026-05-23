import { registerContextMenuItems } from './ContextMenuProvider';
import { canCreateThread } from '../../permissions';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('create-thread-from-message',
  (e, ctx) => !!ctx?.message && !!ctx?.message.channel_id && !ctx?.dm && canCreateThread(ctx.guildMe, ctx.channel),
  (e, ctx) => [{
    label: tBare('contextmenu.create_thread'),
    color: '#9ca3af',
    action: () => window.dispatchEvent(new CustomEvent('createThreadFromMessage', { detail: { parentChannelId: ctx.message.channel_id, messageId: ctx.message.id } })),
  }]
);