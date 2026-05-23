import React from 'react';
import { Markdown } from '../markdown';
import { useT } from '../../hooks/useT';

export default function ProfileBasicsFields({ profile }) {
  const t = useT();
  return (
    <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{t('profile.section.display_name')}</span>
          <span className="text-[10px] text-white/20">{[...(profile.displayName || '')].length}/32</span>
        </div>
        <input
          type="text"
          value={profile.displayName}
          onChange={(e) => profile.setDisplayName(e.target.value)}
          placeholder={t('profile.placeholder.display_name')}
          className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white/85 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
          maxLength={64}
        />
        {profile.displayNameError && <p className="text-[11px] text-red-400 mt-2">{profile.displayNameError}</p>}
        <p className="text-[11px] text-white/25 mt-1.5">{t('profile.hint.display_name')}</p>
      </div>

      <div className="border-t border-white/[0.04] pt-4">
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">{t('profile.section.username')}</span>
        <input
          type="text"
          value={profile.newUsername}
          onChange={(e) => profile.setNewUsername(e.target.value)}
          className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white/85 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
          maxLength={20}
        />
        {profile.usernameError && <p className="text-[11px] text-red-400 mt-2">{profile.usernameError}</p>}
      </div>

      <div className="border-t border-white/[0.04] pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{t('profile.section.bio')}</span>
          <span className="text-[10px] text-white/20">{profile.bio.length}/190</span>
        </div>
        <textarea
          value={profile.bio}
          onChange={(e) => profile.setBio(e.target.value)}
          placeholder={t('profile.placeholder.bio')}
          className="w-full bg-[var(--bg-tertiary)] border border-white/[0.08] rounded-t-xl px-3 py-3 text-sm text-white/85 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none h-28"
          maxLength={190}
        />
        <div className="bg-[var(--bg-tertiary)] border border-t-0 border-white/[0.08] rounded-b-xl px-3 py-3 min-h-[4.5rem]">
          {profile.bio.trim() ? (
            <div className="text-sm text-white/60 leading-relaxed break-words">
              <Markdown text={profile.bio} />
            </div>
          ) : (
            <span className="text-[11px] text-white/15 italic">{t('profile.bio.preview_empty')}</span>
          )}
        </div>
        {profile.error && <p className="text-[11px] text-red-400 mt-2">{profile.error}</p>}
      </div>
    </div>
  );
}