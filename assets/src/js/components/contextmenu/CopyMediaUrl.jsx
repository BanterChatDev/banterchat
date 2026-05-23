import { registerContextMenuItems } from './ContextMenuProvider';
import { attachmentPageUrl, isMediaAttachment } from '../../utils/attachments';
import { t as tBare } from '../../lang/apply';

registerContextMenuItems('copy-media-url',
  (e, ctx) => !!ctx?.message?.attachments?.length && ctx.message.attachments.some(isMediaAttachment),
  (e, ctx) => {
    const media = ctx.message.attachments.filter(isMediaAttachment);
    if (media.length === 1) {
      return [{
        label: tBare('contextmenu.copy_media_url'),
        action: () => navigator.clipboard.writeText(window.location.origin + attachmentPageUrl(media[0].id)),
      }];
    }
    return media.map((a, i) => ({
      label: tBare('contextmenu.copy_media_url_n_template').replace('{n}', i + 1),
      action: () => navigator.clipboard.writeText(window.location.origin + attachmentPageUrl(a.id)),
    }));
  }
);