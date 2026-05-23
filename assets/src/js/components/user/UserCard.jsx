import React from 'react';
import UserAvatar from './UserAvatar';
import UserMenuButton from './UserMenuButton';
import AddFriendButton from './AddFriendButton';
import MutualsSection from './MutualsSection';
import BotBadge from '../ui/BotBadge';
import { u } from '../../api/routes';
import Spinner from '../ui/Spinner';
import { Markdown } from '../markdown';
import { getThemeById } from '../../themes';
import { bannerCropStyle } from '../../utils/bannerCrop';
import { resolveDisplayName } from '../../utils/displayName';
import { formatDate } from './UserInfo';
import { useT } from '../../hooks/useT';
import Status from '../status/Status';

const RING_PX = 6;

export default function UserCard({
  profile,
  loading,
  memberRoles,
  rolesSlot,
  children,
  headerSlot,
  bannerHeight = 100,
  avatarPx = 80,
  onAvatarClick,
  onUserClick,
  onGuildClick,
  hideMutuals = false,
  guildMe,
  currentUserId,
  compact = false,
}) {
  const t = useT();
  const theme = getThemeById(profile?.theme_id || 'dark');
  const v = theme.vars;
  const cardBg = v.user_card_bg || v.bg_tertiary;
  const dim = (a) => `rgb(${v.content_base} / ${a})`;
  const innerBg = v.bg_secondary;
  const hasBanner = !!profile?.banner_id;
  const avatarUrl = profile?.avatar_id ? u.avatar(profile.avatar_id) : null;
  const cBannerHeight = compact ? Math.round(bannerHeight * 0.6) : bannerHeight;
  const cAvatarPx = compact ? 56 : avatarPx;
  const cPadX = compact ? 'px-3' : 'px-4';
  const cPadB = compact ? 'pb-3' : 'pb-4';
  const cNameSize = compact ? 'text-[15px]' : 'text-[18px]';
  const effectiveBannerHeight = hasBanner ? cBannerHeight : Math.round(cBannerHeight * 0.45);
  const avatarOffset = effectiveBannerHeight - cAvatarPx / 2 - RING_PX;
  const hasRoles = !!(rolesSlot && (memberRoles?.length > 0 || rolesSlot.showEmpty));
  const hasInfoCard = !compact && profile && (profile.bio || hasRoles || profile.created_at || profile.joined_at);

  return (
    <div className="overflow-hidden" style={{ backgroundColor: cardBg, position: 'relative' }}>
      <div style={{ height: effectiveBannerHeight, position: 'relative', overflow: 'hidden' }}>
        {hasBanner ? (
          <img src={u.banner(profile.banner_id)} alt="" className="w-full h-full" style={bannerCropStyle(profile.banner_crop)} />
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="" aria-hidden="true" className="w-full h-full object-cover scale-150 blur-2xl opacity-80" style={{ backgroundColor: innerBg }} />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: innerBg }} />
        )}
        {headerSlot}
        {profile && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {profile.id && profile.id !== currentUserId && !profile.is_bot && (
              <AddFriendButton userId={profile.id} username={profile.username} className="w-7 h-7" iconOnly />
            )}
            <UserMenuButton targetUser={profile} guildMe={guildMe} className="w-7 h-7" iconClass="w-4 h-4" />
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: compact ? 12 : 16, top: avatarOffset, padding: RING_PX, borderRadius: '50%', backgroundColor: cardBg }}>
        <div className="relative" style={{ width: cAvatarPx, height: cAvatarPx }}>
          {onAvatarClick ? (
            <button type="button" onClick={onAvatarClick} className="block rounded-full transition-transform hover:scale-[1.02] focus:outline-none w-full h-full" aria-label={t('user.card.expand_aria')}>
              <img src={profile?.avatar_id ? u.avatar(profile.avatar_id) : '/media/default/default.png'} alt={profile?.username || '?'} className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.src = '/media/default/default.png'; }} />
            </button>
          ) : (
            <img src={profile?.avatar_id ? u.avatar(profile.avatar_id) : '/media/default/default.png'} alt={profile?.username || '?'} className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.src = '/media/default/default.png'; }} />
          )}
          {profile && !profile.is_bot && (
            <span className="absolute right-0 bottom-0 leading-none">
              <Status online={!!profile.online} status={profile.presence_status} size="md" />
            </span>
          )}
        </div>
      </div>

      <div style={{ paddingTop: cAvatarPx / 2 + 12 }} className={`${cPadX} ${cPadB}`}>
        {!profile && loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : profile ? (
          <>
            <div className={`${compact ? 'mb-2' : 'mb-3'} min-w-0`}>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`${cNameSize} font-bold leading-tight truncate`} style={{ color: v.text_primary }}>{resolveDisplayName(profile)}</h3>
                {profile.is_bot && <BotBadge />}
              </div>
              {profile.display_name && profile.display_name !== profile.username && (
                <p className="text-[12px] leading-tight truncate" style={{ color: dim(0.45) }}>@{profile.username}</p>
              )}
            </div>

            {!hideMutuals && !compact && profile.id && profile.id !== currentUserId && !profile.is_bot && (
              <MutualsSection userId={profile.id} currentUserId={currentUserId} dim={dim} innerBg={innerBg} onUserClick={onUserClick} onGuildClick={onGuildClick} />
            )}

            {hasInfoCard && (
              <div className="rounded-[8px] p-3 mb-3" style={{ backgroundColor: innerBg }}>
                {profile.bio && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: dim(0.5) }}>{t('profile.preview_card.about')}</div>
                    <div className="text-[13px] leading-relaxed" style={{ color: dim(0.75) }}><Markdown text={profile.bio} /></div>
                  </div>
                )}

                {profile.bio && hasRoles && (
                  <div className="h-px my-3" style={{ backgroundColor: dim(0.08) }} />
                )}

                {hasRoles && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: dim(0.5) }}>{t('user.card.roles')}</div>
                    {rolesSlot.node}
                  </div>
                )}

                {(profile.bio || hasRoles) && (profile.created_at || profile.joined_at) && (
                  <div className="h-px my-3" style={{ backgroundColor: dim(0.08) }} />
                )}

                {(profile.created_at || profile.joined_at) && (
                  <div className="grid grid-cols-2 gap-3">
                    {profile.created_at && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: dim(0.5) }}>{t('user.card.member_since')}</div>
                        <div className="text-[13px]" style={{ color: dim(0.7) }}>{formatDate(profile.created_at)}</div>
                      </div>
                    )}
                    {profile.joined_at && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: dim(0.5) }}>{t('user.card.joined_server')}</div>
                        <div className="text-[13px]" style={{ color: dim(0.7) }}>{formatDate(profile.joined_at)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {children}
          </>
        ) : (
          <p className="text-sm py-4 text-center" style={{ color: dim(0.4) }}>{t('user.card.user_not_found')}</p>
        )}
      </div>
    </div>
  );
}