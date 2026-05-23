import React from 'react';
import { useGuilds } from '../../hooks/useGuilds';
import { useT } from '../../hooks/useT';
import { CloseIcon } from '../icons';
import { bannerCropStyle } from '../../utils/bannerCrop';
import { u } from '../../api/routes';
import GuildDropdown from './GuildDropdown';

const BANNER_HEIGHT = 135;

function MobileClose({ onClick, variant }) {
  const t = useT();
  if (!onClick) return null;
  const cls = variant === 'banner'
    ? 'absolute top-2 right-2 lg:hidden w-7 h-7 flex items-center justify-center rounded-md bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white/85 hover:text-white transition-colors'
    : 'lg:hidden w-10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors flex-shrink-0';
  return (
    <button onClick={onClick} aria-label={t('common.close')} className={cls}>
      <CloseIcon className="w-4 h-4" />
    </button>
  );
}

export default function GuildSidebarHeader({ guildId, user, onCloseMobile }) {
  const { guilds } = useGuilds();
  const guild = (guilds || []).find(g => g.id === guildId);
  const hasBanner = !!(guild && guild.banner);

  if (!hasBanner) {
    return (
      <div className="h-12 flex items-stretch border-b border-white/[0.04] flex-shrink-0">
        <GuildDropdown guild={guild} user={user} />
        <MobileClose onClick={onCloseMobile} variant="header" />
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0" style={{ height: BANNER_HEIGHT }}>
      <img
        src={u.guildBanner(guild.banner)}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full"
        style={bannerCropStyle(guild.banner_crop)}
        draggable={false}
      />
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)]/80 to-transparent pointer-events-none" />
      <MobileClose onClick={onCloseMobile} variant="banner" />
      <div className="absolute left-0 right-0 bottom-0 h-12 flex items-stretch bg-black/10">
        <GuildDropdown guild={guild} user={user} />
      </div>
    </div>
  );
}