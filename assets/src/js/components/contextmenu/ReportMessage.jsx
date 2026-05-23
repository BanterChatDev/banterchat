import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('report-message',
  (e, ctx) => !!ctx?.message && ctx?.user && ctx.message.user_id !== ctx.user.id,
  (e, ctx) => [
    { separator: true },
    {
      label: tBare('contextmenu.report_message'),
      color: '#f87171',
      action: () => window.dispatchEvent(new CustomEvent('openReportModal', {
        detail: {
          targetType: 'message',
          targetId: ctx.message.id,
          targetLabel: ctx.message.username ? tBare('contextmenu.report_message_target_template').replace('{username}', ctx.message.username) : undefined,
        },
      })),
    },
  ]
);