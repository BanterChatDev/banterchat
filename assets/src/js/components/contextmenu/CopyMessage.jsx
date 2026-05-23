import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('copy-message',
  (e, ctx) => !!ctx?.message?.content && !ctx?.message?.embed && !ctx?.message?.is_bot,
  (e, ctx) => [{
    label: tBare('contextmenu.copy_message'),
    action: () => navigator.clipboard.writeText(ctx.message.content),
  }]
);