import { registerContextMenuItems } from './ContextMenuProvider';
import { buildGuildMenuItems } from '../../hooks/useGuildMenuItems';

registerContextMenuItems('guild-actions',
  (e, ctx) => !ctx?.memberActions && !!ctx?.guild,
  (e, ctx) => {
    const canManage = ctx?.canManage || (ctx?.user && ctx.guild.owner_id === ctx.user.id);
    const items = buildGuildMenuItems({ guild: ctx.guild, user: ctx.user, canManage });
    return items.map(it => it.separator ? { separator: true } : ({
      label: it.label,
      icon: it.icon,
      color: it.color,
      danger: it.danger,
      action: it.onClick,
    }));
  }
);