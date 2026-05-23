import React from 'react';
import Card from '../ui/Card';
import { u } from '../../api/routes';
import { useT } from '../../hooks/useT';

export default function GuildCard({ guild, size = 'md', className = '', children }) {
  const t = useT();
  if (!guild) return null;

  const initials = (guild.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const iconClass = size === 'lg' ? 'w-20 h-20 rounded-[24px] text-2xl' : 'w-16 h-16 rounded-2xl text-xl';

  const avatar = (
    <div className={`${iconClass} flex items-center justify-center bg-[var(--accent)] overflow-hidden`}>
      {guild.icon ? (
        <img src={u.guildAvatar(guild.icon)} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-white select-none">{initials}</span>
      )}
    </div>
  );

  const bannerUrl = guild.banner ? u.guildBanner(guild.banner) : null;
  const bannerFallback = { background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' };

  return (
    <Card
      className={className}
      bannerUrl={bannerUrl}
      bannerCrop={guild.banner_crop}
      bannerFallback={bannerFallback}
      avatar={avatar}
      title={guild.name}
      subtitle={t('guilds.card_members_template').replace('{n}', guild.member_count || 0)}
      size={size}
    >
      {guild.description && (
        <div>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1">{t('guilds.card_about')}</span>
          <p className="text-[13px] text-white/60 leading-relaxed">{guild.description}</p>
        </div>
      )}
      {children}
    </Card>
  );
}