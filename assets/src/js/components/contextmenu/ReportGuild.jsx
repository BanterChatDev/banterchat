import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('report-guild',
  (e, ctx) => !!ctx?.guild && ctx?.user && ctx.guild.owner_id !== ctx.user.id,
  (e, ctx) => [
    { separator: true },
    {
      label: tBare('contextmenu.report_server'),
      color: '#f87171',
      action: () => window.dispatchEvent(new CustomEvent('openReportModal', {
        detail: { targetType: 'guild', targetId: ctx.guild.id, targetLabel: ctx.guild.name },
      })),
    },
  ]
);