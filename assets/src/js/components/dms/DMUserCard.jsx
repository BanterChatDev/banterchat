import React, { useState } from 'react';
import { apiGetUser } from '../../api/users';
import { u } from '../../api/routes';
import { useCache } from '../../hooks/useCache';
import { usePermEvents } from '../../hooks/usePermEvents';
import { createProfileHandlers } from '../../broadcasts';
import BotBadge from '../ui/BotBadge';
import Spinner from '../ui/Spinner';
import { Markdown } from '../markdown';
import { getThemeById } from '../../themes';
import { resolveDisplayName } from '../../utils/displayName';
import UserMenuButton from '../user/UserMenuButton';
import AddFriendButton from '../user/AddFriendButton';
import MutualsSection from '../user/MutualsSection';
import UserProfileModal from '../user/UserProfileModal';
import useGuildPreview from '../../hooks/useGuildPreview';
import { useT } from '../../hooks/useT';

const AVATAR_PX = 120;

function formatMemberSince(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DMUserCard({ peerId, width, currentUserId }) {
  const t = useT();
  const { data: profile, loading, setData: setProfile } = useCache(
    peerId ? `user:${peerId}` : null,
    () => apiGetUser(peerId),
    { ttl: 60000 }
  );
  usePermEvents(createProfileHandlers(peerId, setProfile));
  const [profileOpen, setProfileOpen] = useState(false);
  const { open: handleGuildClick, modal: guildPreviewModal } = useGuildPreview();

  if (!peerId) return null;

  const theme = getThemeById(profile?.theme_id || 'dark');
  const v = theme.vars;
  const dim = (a) => `rgb(${v.content_base} / ${a})`;
  const avatarSrc = profile?.avatar_id ? u.avatar(profile.avatar_id) : '/media/default/default.png';

  return (
    <div
      className="hidden lg:flex flex-col flex-shrink-0 border-l border-white/[0.04] overflow-y-auto relative"
      style={{ width, backgroundColor: v.bg_secondary }}
    >
      {profile && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {!profile.is_bot && profile.id !== currentUserId && (
            <AddFriendButton userId={profile.id} username={profile.username} className="w-8 h-8" iconOnly />
          )}
          <UserMenuButton targetUser={profile} className="w-8 h-8" iconClass="w-4 h-4" />
        </div>
      )}
      {loading && !profile ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !profile ? (
        <p className="text-sm py-12 text-center" style={{ color: dim(0.4) }}>{t('user.card.user_not_found')}</p>
      ) : (
        <div className="flex flex-col px-5 pt-8 pb-6">
          <div className="flex justify-center mb-5">
            <button type="button" onClick={() => setProfileOpen(true)} className="rounded-full transition-transform hover:scale-[1.02] focus:outline-none" aria-label={t('dms.user_card.open_profile_aria')}>
              <img
                src={avatarSrc}
                alt={profile.username || ''}
                onError={(e) => { e.currentTarget.src = '/media/default/default.png'; }}
                className="rounded-full object-cover"
                style={{ width: AVATAR_PX, height: AVATAR_PX, boxShadow: `0 0 0 6px ${v.bg_secondary}, 0 0 0 8px ${v.accent}` }}
              />
            </button>
          </div>

          <div className="flex flex-col items-center mb-5 min-w-0 max-w-full">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-[22px] font-bold leading-tight text-center break-words" style={{ color: v.text_primary }}>
                {resolveDisplayName(profile)}
              </h3>
              {profile.is_bot && <BotBadge />}
            </div>
            {profile.display_name && profile.display_name !== profile.username && (
              <p className="text-[13px] mt-0.5" style={{ color: dim(0.45) }}>@{profile.username}</p>
            )}
          </div>

          <div className="rounded-[10px] p-4 flex flex-col gap-4" style={{ backgroundColor: v.bg_tertiary }}>
            {profile.bio ? (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: dim(0.5) }}>{t('profile.preview_card.about')}</div>
                <div className="text-[13px] leading-relaxed break-words" style={{ color: dim(0.85) }}>
                  <Markdown text={profile.bio} />
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: dim(0.5) }}>{t('profile.preview_card.about')}</div>
                <div className="text-[12px] italic" style={{ color: dim(0.35) }}>{t('dms.user_card.no_bio')}</div>
              </div>
            )}

            <div className="h-px" style={{ backgroundColor: dim(0.08) }} />

            {profile.created_at && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: dim(0.5) }}>{t('user.card.member_since')}</div>
                <div className="text-[13px]" style={{ color: dim(0.8) }}>{formatMemberSince(profile.created_at)}</div>
              </div>
            )}
          </div>

          {profile.id !== currentUserId && !profile.is_bot && (
            <div className="mt-4">
              <MutualsSection userId={profile.id} currentUserId={currentUserId} dim={dim} innerBg={v.bg_tertiary} onGuildClick={handleGuildClick} />
            </div>
          )}

          </div>
      )}
      {profileOpen && profile && <UserProfileModal userId={profile.id} currentUserId={currentUserId} onClose={() => setProfileOpen(false)} initialExpanded />}
      {guildPreviewModal}
    </div>
  );
}