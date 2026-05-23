import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('voice-peer-copy-id',
  (e, ctx) => !!ctx?.voicePeer,
  (e, ctx) => [{
    label: tBare('contextmenu.copy_user_id') || 'Copy User ID',
    color: '#6b7280',
    action: () => {
      try { navigator.clipboard.writeText(ctx.voicePeer.user_id); } catch {}
    },
  }]
);