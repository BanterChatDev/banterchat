import React from 'react';
import { bannerCropStyle } from '../../utils/bannerCrop';

// Shared banner+avatar card shell. Used by ProfilePreviewCard (user profile
// preview in onboarding + user settings) and GuildCard (invite page + any
// future guild preview surface). Handles the banner strip, the overlapping
// avatar slot, and the title/subtitle area. Arbitrary `children` render
// inside a tucked-in body section below.
//
// Props:
//   bannerUrl    — background image URL (optional). If null/empty, fallback gradient renders.
//   bannerCrop   — passed through to bannerCropStyle() for image object-position.
//   bannerFallback — when bannerUrl is empty, this is the inline style for the gradient strip.
//   avatar       — arbitrary node rendered as the avatar (e.g. UserAvatar, guild-icon <div>).
//   title        — primary text, rendered colored if `titleColor` is passed.
//   titleColor   — CSS color for the title (role color / accent).
//   subtitle     — smaller text under the title.
//   size         — 'md' (default) | 'lg' — controls banner height + spacing.
//   className    — extra classes on the outer shell.
export default function Card({
  bannerUrl,
  bannerCrop,
  bannerFallback,
  avatar,
  title,
  titleColor,
  subtitle,
  size = 'md',
  className = '',
  children,
}) {
  const bannerH = size === 'lg' ? 'h-[140px]' : 'h-[116px]';
  const avatarOffset = size === 'lg' ? '-mt-11' : '-mt-9';

  return (
    <div className={`bg-[var(--bg-tertiary)] rounded-3xl overflow-hidden border border-white/[0.08] shadow-xl ${className}`}>
      <div className={`${bannerH} overflow-hidden`}>
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full" style={bannerCropStyle(bannerCrop)} />
        ) : (
          <div className="w-full h-full" style={bannerFallback} />
        )}
      </div>

      <div className="px-4 py-4 pb-5">
        {avatar && (
          <div className={`flex items-center gap-3 mb-3 ${avatarOffset}`}>
            <div className="rounded-full p-[3px] bg-[var(--bg-tertiary)] shrink-0">
              {avatar}
            </div>
          </div>
        )}

        {title && (
          <h3 className="text-[15px] font-bold truncate leading-tight" style={titleColor ? { color: titleColor } : undefined}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p>
        )}

        {children && (
          <div className="bg-[var(--bg-secondary)]/50 rounded-2xl p-3 mt-3 space-y-2.5">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}