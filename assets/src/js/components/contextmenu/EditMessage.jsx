import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('edit-message',
  (e, ctx) => !!ctx?.message && ctx?.user && ctx.user.id === ctx.message.user_id && !ctx.message.embed && !ctx.message._commandError && !ctx.message.system_type,
  (e, ctx) => {
    const msg = ctx.message;
    return [{
      separator: true,
    }, {
      label: tBare('contextmenu.edit_message'),
      color: '#60a5fa',
      action: () => {
        window.dispatchEvent(new CustomEvent('editMessage', { detail: { id: msg.id, content: msg.content, channel_id: msg.channel_id } }));
      },
    }];
  }
);