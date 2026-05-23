import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('copy-message-id',
  (e, ctx) => !!ctx?.message,
  (e, ctx) => [{
    label: tBare('contextmenu.copy_message_id'),
    color: '#6b7280',
    action: () => navigator.clipboard.writeText(ctx.message.id),
  }]
);