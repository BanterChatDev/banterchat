import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('dm-mark-read',
  (e, ctx) => !!ctx?.dm && !ctx?.channel && !ctx?.message,
  (e, ctx) => [{
    label: tBare('contextmenu.mark_as_read'),
    color: '#6b7280',
    action: () => {
      if (ctx.markChannelRead) ctx.markChannelRead(ctx.dm.id);
    },
  }]
);

registerContextMenuItems('dm-copy-id',
  (e, ctx) => !!ctx?.dm && !ctx?.channel && !ctx?.message,
  (e, ctx) => [{
    label: tBare('contextmenu.copy_user_id'),
    color: '#6b7280',
    action: () => {
      if (ctx.dm?.peer_id) navigator.clipboard.writeText(ctx.dm.peer_id);
    },
  }]
);

registerContextMenuItems('dm-close',
  (e, ctx) => !!ctx?.dm && !ctx?.channel && !ctx?.message,
  (e, ctx) => [
    { separator: true },
    {
      label: tBare('dms.sidebar.close_title'),
      danger: true,
      action: () => {
        import('../../api/dms').then(mod => mod.apiCloseDM(ctx.dm.peer_id)).catch(() => {});
      },
    },
  ]
);