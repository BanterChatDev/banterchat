import React from 'react';
import { u } from '../../api/routes';
import { apiUploadWebhookAvatar, apiDeleteWebhookAvatar } from '../../api/webhooks';
import AvatarUpload from '../ui/AvatarUpload';
import { useImageUpload } from '../../hooks/useImageUpload';

function Initials({ name }) {
  const initials = (name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-white/[0.08] flex items-center justify-center select-none">
      <span className="text-[13px] font-bold text-white/55">{initials}</span>
    </div>
  );
}

export default function WebhookAvatarBlock({ webhook, onUpdated }) {
  const hasAvatar = !!webhook.avatar_id;

  const img = useImageUpload({
    maxSize: 4 * 1024 * 1024,
    aspect: 1,
    applyCrop: true,
    cropTargetLongEdge: 512,
    upload: (file) => apiUploadWebhookAvatar(webhook.id, file),
    remove: () => apiDeleteWebhookAvatar(webhook.id),
    onUpload: (res) => onUpdated?.(res.avatar_id),
    onRemove: () => onUpdated?.(''),
  });

  const previewEl = hasAvatar ? (
    <img
      src={u.webhookAvatar(webhook.avatar_id)}
      alt={webhook.name}
      className="w-12 h-12 rounded-full object-cover"
    />
  ) : (
    <Initials name={webhook.name} />
  );

  return (
    <AvatarUpload
      img={img}
      hasImage={hasAvatar}
      previewEl={previewEl}
      wrapperClass="rounded-full w-12 h-12"
    />
  );
}