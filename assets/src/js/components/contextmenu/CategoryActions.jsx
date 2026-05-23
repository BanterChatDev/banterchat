import { registerContextMenuItems } from './ContextMenuProvider';
import { PERM_MANAGE_CHANNELS } from '../../permissions';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('category-copy-id',
  (e, ctx) => !!ctx?.category,
  (e, ctx) => [{
    label: tBare('contextmenu.copy_category_id'),
    color: '#6b7280',
    action: () => navigator.clipboard.writeText(ctx.category.id),
  }]
);

registerContextMenuItems('category-admin-actions',
  (e, ctx) => !!ctx?.category && typeof ctx?.can === 'function' && ctx.can(PERM_MANAGE_CHANNELS),
  (e, ctx) => {
    const cat = ctx.category;
    return [
      { separator: true },
      {
        label: tBare('contextmenu.edit_category'),
        color: '#60a5fa',
        action: () => window.dispatchEvent(new CustomEvent('editCategory', { detail: cat })),
      },
      {
        label: tBare('contextmenu.delete_category'),
        danger: true,
        action: () => {
          import('../../api/categories').then(mod => mod.apiDeleteCategory(cat.id)).catch(() => {});
        },
      },
    ];
  }
);