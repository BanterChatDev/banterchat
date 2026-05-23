import { registerContextMenuItems } from './ContextMenuProvider';
import { canManageMessages } from '../../permissions';
import { t as tBare } from '../../lang/apply';

function ownerOrSubject(msg) {
  if (msg.user_id) return msg.user_id;
  if (!msg.system_type) return '';
  const meta = typeof msg.meta === 'string' ? (() => { try { return JSON.parse(msg.meta); } catch { return {}; } })() : (msg.meta || {});
  return meta.user_id || '';
}

registerContextMenuItems('delete-message',
  (e, ctx) => !!ctx?.message && ctx?.user && (
    ctx.user.id === ownerOrSubject(ctx.message) ||
    canManageMessages(ctx.guildMe, ctx.channel)
  ),
  (e, ctx) => {
    const msg = ctx.message;
    return [{
      label: tBare('contextmenu.delete_message'),
      danger: true,
      action: () => {
        window.__wsSend?.({ type: 'message_delete', payload: { message_id: msg.id, channel_id: msg.channel_id } });
      },
    }];
  }
);