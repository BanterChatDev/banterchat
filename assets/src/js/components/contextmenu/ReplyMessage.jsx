import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('reply-message',
  (e, ctx) => !!ctx?.message && !ctx.message.system_type,
  (e, ctx) => [{
    separator: true,
  }, {
    label: tBare('contextmenu.reply'),
    action: () => {
      window.dispatchEvent(new CustomEvent('replyToMessage', { detail: ctx.message }));
    },
  }]
);