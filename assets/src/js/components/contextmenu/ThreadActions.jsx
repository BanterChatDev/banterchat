import { registerContextMenuItems } from './ContextMenuProvider';
import { PERM_MANAGE_CHANNELS } from '../../permissions';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('thread-copy-id',
  (e, ctx) => !!ctx?.thread,
  (e, ctx) => [{
    label: tBare('contextmenu.copy_thread_id'),
    color: '#6b7280',
    action: () => navigator.clipboard.writeText(ctx.thread.id),
  }]
);

registerContextMenuItems('thread-actions',
  (e, ctx) => !!ctx?.thread && typeof ctx?.can === 'function' && (ctx.can(PERM_MANAGE_CHANNELS) || ctx.thread.owner_id === ctx?.user?.id),
  (e, ctx) => {
    const th = ctx.thread;
    const items = [{ separator: true }];
    if (th.archived) {
      items.push({
        label: tBare('contextmenu.unarchive_thread'),
        color: '#9ca3af',
        action: () => {
          import('../../api/threads').then(mod => mod.apiUnarchiveThread(th.id)).catch(() => {});
        },
      });
    } else {
      items.push({
        label: tBare('contextmenu.archive_thread'),
        color: '#9ca3af',
        action: () => {
          import('../../api/threads').then(mod => mod.apiArchiveThread(th.id)).catch(() => {});
        },
      });
    }
    if (typeof ctx?.can === 'function' && ctx.can(PERM_MANAGE_CHANNELS)) {
      items.push({
        label: tBare('contextmenu.delete_thread'),
        danger: true,
        action: () => {
          import('../../api/threads').then(mod => mod.apiDeleteThread(th.id)).catch(() => {});
        },
      });
    }
    return items;
  }
);