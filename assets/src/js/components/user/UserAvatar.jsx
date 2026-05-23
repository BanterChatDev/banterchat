import React, { useState } from 'react';
import { getAvatar } from '../../utils/avatarStore';
import { u } from '../../api/routes';

export default function UserAvatar({ username, avatarId, avatarUrl, userId, size = 'md', isWebhook = false }) {
  const sizes = { sm: 'w-6 h-6 text-[9px]', md: 'w-8 h-8 text-[11px]', lg: 'w-10 h-10 text-sm', xl: 'w-20 h-20 text-2xl' };
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizes[size] || sizes.md;

  if (avatarUrl && !imgError) {
    return (
      <img
        src={u.proxy(avatarUrl)}
        alt={username || '?'}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  const resolvedAvatar = avatarId || (!isWebhook && userId ? getAvatar(userId) : '');

  if (resolvedAvatar && !imgError) {
    return (
      <img
        src={isWebhook ? u.webhookAvatar(resolvedAvatar) : u.avatar(resolvedAvatar)}
        alt={username || '?'}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <img
      src="/media/default/default.png"
      alt={username || '?'}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
    />
  );
}