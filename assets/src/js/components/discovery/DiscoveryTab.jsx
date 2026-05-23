import React, { useState, useEffect, useCallback } from 'react';
import { apiGetListing, apiPutListing, apiDeleteListing } from '../../api/discovery';
import InvitePicker from '../guilds/InvitePicker';
import SearchableSelect from '../ui/SearchableSelect';
import Spinner from '../ui/Spinner';
import DiscoverySlugField from './DiscoverySlugField';
import DiscoveryBioField from './DiscoveryBioField';
import DiscoveryTagsField from './DiscoveryTagsField';
import { LANGUAGE_OPTIONS, MAX_BIO, MAX_TAGS, slugFromName } from './languages';
import { useInvites } from '../../hooks/useInvites';
import { pickReusableInvite } from '../guilds/inviteUtils';
import { useT } from '../../hooks/useT';
import { DISCOVERY_URL } from '../../config';

export default function DiscoveryTab({ guild }) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(null);
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('en');
  const [nsfw, setNsfw] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [slugCheck, setSlugCheck] = useState({ state: 'idle', reason: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { invites } = useInvites(guild?.id);

  useEffect(() => {
    if (!guild?.id) return;
    let cancelled = false;
    setLoading(true);
    apiGetListing(guild.id)
      .then((listing) => {
        if (cancelled) return;
        setExisting(listing);
        setSlug(listing.slug || '');
        setBio(listing.bio || '');
        setTags(listing.tags || '');
        setLanguage(listing.language || 'en');
        setNsfw(!!listing.nsfw);
        setInviteCode(listing.invite_code || '');
      })
      .catch(() => {
        if (cancelled) return;
        setExisting(null);
        setSlug(slugFromName(guild.name));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guild?.id]);

  useEffect(() => {
    if (loading || existing || inviteCode || !invites || invites.length === 0) return;
    const best = pickReusableInvite(invites);
    if (best) setInviteCode(best.code);
  }, [loading, existing, inviteCode, invites]);

  const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
  const canPublish = !loading
    && !saving
    && slug.length >= 3
    && slugCheck.state === 'ok'
    && bio.length <= MAX_BIO
    && tagList.length <= MAX_TAGS
    && !!inviteCode;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await apiPutListing(guild.id, {
        slug: slug.trim(),
        bio: bio.trim(),
        tags: tagList.join(','),
        language,
        nsfw,
        invite_code: inviteCode,
      });
      setExisting(res);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e?.message || t('discovery.fail_publish'));
    }
    setSaving(false);
  }, [guild?.id, slug, bio, tagList, language, nsfw, inviteCode, t]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await apiDeleteListing(guild.id);
      setExisting(null);
      setConfirmDelete(false);
    } catch (e) {
      setError(e?.message || t('discovery.fail_unlist'));
    }
    setSaving(false);
  }, [guild?.id, t]);

  if (loading) {
    return <div className="p-6 flex justify-center"><Spinner /></div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-white/80">{t('discovery.tab_heading')}</h3>
        <p className="text-[11px] text-white/35 mt-1 leading-relaxed">
          {t('discovery.tab_subtitle_prefix')}<span className="text-white/50">{t('discovery.tab_subtitle_domain')}</span>{t('discovery.tab_subtitle_suffix')}
        </p>
      </div>

      <div className="space-y-5">
        <DiscoverySlugField
          guildId={guild.id}
          value={slug}
          onChange={setSlug}
          existingSlug={existing?.slug}
          check={slugCheck}
          onCheck={setSlugCheck}
        />

        <DiscoveryBioField value={bio} onChange={setBio} />

        <DiscoveryTagsField value={tags} onChange={setTags} />

        <div>
          <label className="tw-label mb-1.5">{t('discovery.field_language_label')}</label>
          <SearchableSelect
            value={language}
            onChange={(v) => setLanguage(v)}
            options={LANGUAGE_OPTIONS}
            searchPlaceholder={t('discovery.language_search_placeholder')}
          />
        </div>

        <div>
          <label className="tw-label mb-1.5">{t('discovery.field_invite_label')}</label>
          <InvitePicker
            guildId={guild.id}
            value={inviteCode}
            onChange={setInviteCode}
            placeholder={t('discovery.field_invite_placeholder')}
          />
          <p className="text-[11px] text-white/25 mt-1.5">{t('discovery.field_invite_hint')}</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={nsfw}
            onChange={(e) => setNsfw(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--accent)]"
          />
          <span>
            <span className="text-sm text-white/70 font-medium">{t('discovery.nsfw_checkbox_label')}</span>
            <span className="block text-[11px] text-white/30 mt-0.5">{t('discovery.nsfw_checkbox_hint')}</span>
          </span>
        </label>

        {error && (
          <p className="text-[12px] text-red-400/80 bg-red-500/[0.08] border border-red-500/20 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
          <button
            onClick={handleSave}
            disabled={!canPublish}
            className="tw-btn-accent px-5 rounded-md"
          >
            {saving ? t('common.saving') : saved ? t('discovery.btn_saved') : existing ? t('discovery.btn_update') : t('discovery.btn_publish')}
          </button>
          {existing && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="text-xs text-white/40 hover:text-red-400/80 transition-colors"
            >
              {t('discovery.btn_unlist')}
            </button>
          )}
          {existing && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50">{t('discovery.confirm_unlist_question')}</span>
              <button onClick={handleDelete} disabled={saving} className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold">{t('discovery.confirm_unlist_yes')}</button>
              <button onClick={() => setConfirmDelete(false)} disabled={saving} className="text-xs text-white/30 hover:text-white/60 transition-colors">{t('common.cancel')}</button>
            </div>
          )}
          {existing && DISCOVERY_URL && (
            <a
              href={`${DISCOVERY_URL.replace(/\/$/, '')}/${existing.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--accent)] hover:underline ml-auto"
            >
              {t('discovery.view_public_page')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}