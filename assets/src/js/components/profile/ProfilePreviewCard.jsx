import React from 'react';
import UserAvatar from '../user/UserAvatar';
import Card from '../ui/Card';
import { ClickCopy } from '../ui/ClickCopy';
import { Markdown } from '../markdown';
import { u } from '../../api/routes';
import { useT } from '../../hooks/useT';

export default function ProfilePreviewCard({ profile, className = '' }) {
  const t = useT();
  const { user, displayUsername, fallbackTint, bio } = profile;
  const bannerUrl = user.banner_id ? u.banner(user.banner_id) : null;
  const bannerFallback = { background: `linear-gradient(135deg, ${fallbackTint}40 0%, ${fallbackTint}18 100%)` };

  return (
    <Card
      className={className}
      bannerUrl={bannerUrl}
      bannerCrop={user.banner_crop}
      bannerFallback={bannerFallback}
      avatar={<UserAvatar username={displayUsername} avatarId={user.avatar_id} size="lg" />}
      title={displayUsername}
      titleColor={fallbackTint}
    >
      {bio.trim() || user.bio ? (
        <div>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1">{t('profile.preview_card.about')}</span>
          <div className="text-[13px] text-white/60 leading-relaxed">
            <Markdown text={bio} />
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-white/20 italic">{t('profile.preview_card.no_bio')}</p>
      )}
      <div>
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1">{t('profile.preview_card.user_id')}</span>
        <ClickCopy text={user.id} className="text-xs text-white/50 font-mono" />
      </div>
    </Card>
  );
}