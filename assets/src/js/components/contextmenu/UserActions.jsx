import { registerContextMenuItems } from './ContextMenuProvider';
import { buildUserMenuItems } from '../../hooks/useUserMenuItems';

registerContextMenuItems('user-actions',
  (e, ctx) => !!ctx?.targetUser && !!ctx?.user,
  (e, ctx) => {
    const isBlocked = ctx.isBlocked ? ctx.isBlocked(ctx.targetUser.id) : false;
    const items = buildUserMenuItems({
      targetUser: ctx.targetUser,
      currentUser: ctx.user,
      guild: ctx.guild,
      guildMe: ctx.guildMe,
      isBlocked,
      includeMessage: true,
    });
    return items.map(it => it.separator ? { separator: true } : ({
      label: it.label,
      icon: it.icon,
      color: it.color,
      danger: it.danger,
      action: it.onClick,
    }));
  }
);