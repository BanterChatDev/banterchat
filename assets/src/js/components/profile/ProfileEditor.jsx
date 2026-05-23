import React from 'react';
import { useProfileSetup } from '../../hooks/useProfileSetup';
import { useT } from '../../hooks/useT';
import ProfileBasicsFields from './ProfileBasicsFields';
import ProfileMediaFields from './ProfileMediaFields';
import ProfilePreviewCard from './ProfilePreviewCard';

export default function ProfileEditor({ user, setUser, dirtyRef, heading, description, renderActions }) {
  const profile = useProfileSetup({ user, setUser, dirtyRef });
  const t = useT();

  return (
    <div className="space-y-4 lg:space-y-5">
      {(heading || description) && (
        <div className="max-w-4xl">
          {heading && <h2 className="text-2xl sm:text-3xl font-bold text-white/95">{heading}</h2>}
          {description && <p className="text-sm text-white/40 mt-2 max-w-2xl">{description}</p>}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-5xl">
        <div className="flex-1 min-w-0 space-y-4 lg:space-y-5">
          <ProfileMediaFields profile={profile} />
          <ProfileBasicsFields profile={profile} />

          {renderActions ? renderActions({
            profile,
            isDirty: profile.isDirty,
            saving: profile.saving,
            handleSave: profile.handleSave,
            handleReset: profile.handleReset,
          }) : (
            profile.isDirty && (
              <div className="sticky bottom-0 bg-[var(--bg-tertiary)]/95 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg shadow-black/20">
                <span className="text-[12px] text-white/50">{t('common.unsaved_changes')}</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button onClick={profile.handleReset} className="flex-1 sm:flex-none text-[12px] text-white/40 hover:text-white/60 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all">
                    {t('common.reset')}
                  </button>
                  <button onClick={profile.handleSave} disabled={profile.saving} className="flex-1 sm:flex-none text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg px-4 py-2 transition-all disabled:opacity-50">
                    {profile.saving ? t('common.saving') : t('common.save_changes')}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <div className="order-first lg:order-none w-full lg:w-[320px] flex-shrink-0">
          <div className="lg:sticky lg:top-0">
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-2 lg:mb-3">{t('profile.preview')}</span>
            <ProfilePreviewCard profile={profile} />
          </div>
        </div>
      </div>
    </div>
  );
}