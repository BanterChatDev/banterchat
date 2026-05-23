import React from 'react';
import { MentionText } from '../mention';

import { imgSrc } from './LinkEmbed/shared';
import { attachmentRawUrl } from '../../utils/attachments';

const DEFAULT_COLOR = '#5865f2';

function EmbedFields({ fields, onMentionClick }) {
  const hasInline = fields.some(f => f.inline);
  return (
    <div className="grid gap-y-2 gap-x-4 mt-2" style={{ gridTemplateColumns: hasInline ? 'repeat(3, minmax(0, 1fr))' : 'minmax(0, 1fr)' }}>
      {fields.map((f, i) => (
        <div key={i} className={f.inline ? 'min-w-0' : 'col-span-full min-w-0'}>
          <p className="text-[11px] text-white/80 font-semibold mb-0.5"><MentionText content={f.name} onMentionClick={onMentionClick} inline /></p>
          <div className="text-[13px] text-white/75 leading-relaxed break-words"><MentionText content={f.value} onMentionClick={onMentionClick} /></div>
        </div>
      ))}
    </div>
  );
}

function asText(v, key) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v[key] || '';
  return '';
}

function asUrl(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.url || '';
  return '';
}

function lookupAttachmentUrl(attachmentId, attachments) {
  if (!attachmentId || !attachments) return '';
  const found = attachments.find(a => a.id === attachmentId);
  return found ? attachmentRawUrl(found.id) : '';
}

function resolveImageSlot(slot, attachments) {
  if (!slot) return '';
  if (typeof slot === 'object' && slot.attachment_id) {
    return lookupAttachmentUrl(slot.attachment_id, attachments);
  }
  return asUrl(slot);
}

// Like resolveImageSlot, but for icon slots (author/footer) where the icon
// fields live on the parent: parent.icon_url and parent.icon_attachment_id.
function resolveIconSlot(parent, attachments) {
  if (!parent) return '';
  if (parent.icon_attachment_id) {
    return lookupAttachmentUrl(parent.icon_attachment_id, attachments);
  }
  return parent.icon_url || '';
}

export default function EmbedView({ embed, attachments, onMentionClick, chromeless = false }) {
  if (!embed) return null;

  const color = embed.color || DEFAULT_COLOR;
  const authorText = asText(embed.author, 'name');
  const footerText = asText(embed.footer, 'text');
  const imageUrl = resolveImageSlot(embed.image, attachments);
  const thumbnailUrl = resolveImageSlot(embed.thumbnail, attachments);

  const body = (
    <div className="flex">
      <div className="flex-1 min-w-0">
        {authorText && (
          <p className="text-[12px] text-white/85 font-medium mb-1.5"><MentionText content={authorText} onMentionClick={onMentionClick} inline /></p>
        )}
        {embed.title && (
          <p className="text-[15px] text-white font-semibold mb-1 leading-snug"><MentionText content={embed.title} onMentionClick={onMentionClick} inline /></p>
        )}
        {embed.description && (
          <div className="text-[13px] text-white/75 leading-relaxed break-words"><MentionText content={embed.description} onMentionClick={onMentionClick} /></div>
        )}
        {embed.fields?.length > 0 && <EmbedFields fields={embed.fields} onMentionClick={onMentionClick} />}
        {imageUrl && (
          <img src={imgSrc(imageUrl)} className="max-w-full rounded mt-3" alt="" loading="lazy" />
        )}
        {footerText && (
          <p className="text-[11px] text-white/55 mt-3"><MentionText content={footerText} onMentionClick={onMentionClick} inline /></p>
        )}
      </div>
      {thumbnailUrl && (
        <div className="flex-shrink-0 ml-4">
          <img src={imgSrc(thumbnailUrl)} className="w-20 h-20 rounded object-cover" alt="" loading="lazy" />
        </div>
      )}
    </div>
  );

  if (chromeless) return body;

  return (
    <div className="max-w-[520px] flex rounded overflow-hidden bg-[rgb(255,255,255,0.02)] border border-white/[0.04] mt-1">
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="px-3 py-2.5 min-w-0 flex-1">
        {body}
      </div>
    </div>
  );
}