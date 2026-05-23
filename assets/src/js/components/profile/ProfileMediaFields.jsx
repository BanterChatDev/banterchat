import React from 'react';
import UserAvatar from '../user/UserAvatar';
import AvatarUpload from '../ui/AvatarUpload';
import { apiUploadAvatar, apiDeleteAvatar, apiUploadBanner, apiDeleteBanner } from '../../api/users';
import { u } from '../../api/routes';
import { useImageUpload } from '../../hooks/useImageUpload';
import { bannerCropStyle } from '../../utils/bannerCrop';
import { useT } from '../../hooks/useT';

export default function ProfileMediaFields({ profile }) {
  const t = useT();
  const { user, setUser, displayUsername, fallbackTint } = profile;

  const avatar = useImageUpload({
    maxSize: 5 * 1024 * 1024,
    aspect: 1,
    applyCrop: true,
    cropTargetLongEdge: 512,
    upload: apiUploadAvatar,
    remove: apiDeleteAvatar,
    onUpload: (res) => setUser(prev => ({ ...prev, avatar_id: res.avatar_id })),
    onRemove: () => setUser(prev => ({ ...prev, avatar_id: '' })),
  });

  const banner = useImageUpload({
    maxSize: 6 * 1024 * 1024,
    aspect: 3,
    upload: apiUploadBanner,
    remove: apiDeleteBanner,
    onUpload: (res) => setUser(prev => ({ ...prev, banner_id: res.banner_id, banner_crop: res.banner_crop })),
    onRemove: () => setUser(prev => ({ ...prev, banner_id: '', banner_crop: '' })),
  });

  return (
    <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5 space-y-5">
      <div>
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-2">{t('profile.section.avatar')}</span>
        <div className="flex items-center gap-4">
          <div className="rounded-full p-0.5 bg-white/[0.06] inline-block">
            <AvatarUpload
              img={avatar}
              hasImage={!!user.avatar_id}
              previewEl={<UserAvatar username={displayUsername} avatarId={user.avatar_id} size="xl" />}
            />
          </div>
          <div className="text-[11px] text-white/30 leading-relaxed">
            <p>{t('profile.hint.avatar_formats')}</p>
            <p>{t('profile.hint.avatar_max_size')}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.04] pt-5">
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-2">{t('profile.section.banner')}</span>
        <AvatarUpload
          img={banner}
          hasImage={!!user.banner_id}
          wrapperClass="rounded-2xl w-full"
          previewEl={user.banner_id ? (
            <img src={u.banner(user.banner_id)} alt={t('profile.preview_card.banner_alt')} className="w-full h-32 rounded-2xl" style={bannerCropStyle(user.banner_crop)} />
          ) : (
            <div className="w-full h-32 rounded-2xl" style={{ background: `linear-gradient(135deg, ${fallbackTint}44 0%, ${fallbackTint}22 100%)` }} />
          )}
        />
        <p className="text-[11px] text-white/20 mt-2">{t('profile.hint.banner_dimensions')}</p>
      </div>
    </div>
  );
}