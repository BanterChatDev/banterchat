import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('channel-list-whitespace',
  (e, ctx) => !!ctx?.channelListWhitespace,
  (e, ctx) => [
    {
      label: tBare('channels.list.create_channel_title'),
      color: '#3ba55c',
      action: () => ctx.onCreateChannel?.(),
    },
    {
      label: tBare('channels.list.create_category'),
      color: '#60a5fa',
      action: () => ctx.onCreateCategory?.(),
    },
  ]
);