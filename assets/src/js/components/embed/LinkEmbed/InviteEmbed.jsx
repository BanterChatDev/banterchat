import React, { useEffect, useState, useCallback } from 'react';
import { apiGetInvitePreview, apiJoinByInvite } from '../../../api/guilds';
import { u } from '../../../api/routes';
import { channelPath } from '../../../routes';
import { EmbedCard } from './shared';
import { useT } from '../../../hooks/useT';

function spaNavigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function InviteCardShell({ children, accent = 'var(--accent)' }) {
  return (
    <EmbedCard accent={accent}>
      <div className="p-3 space-y-2.5">{children}</div>
    </EmbedCard>
  );
}

function GuildRow({ preview }) {
  const t = useT();
  const initial = (preview.guild_name || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
        style={{ background: preview.guild_icon ? 'transparent' : 'var(--accent)' }}
      >
        {preview.guild_icon ? (
          <img src={u.guildAvatar(preview.guild_icon)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-semibold">{initial}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-white/90 truncate">{preview.guild_name}</p>
        <p className="text-[11px] text-white/40">{t('embed_invite.members_template').replace('{n}', preview.member_count || 0)}</p>
      </div>
    </div>
  );
}

export default function InviteEmbed({ code }) {
  const t = useT();
  const [preview, setPreview] = useState(null);
  const [previewErr, setPreviewErr] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiGetInvitePreview(code)
      .then(data => { if (!cancelled) setPreview(data); })
      .catch(e => { if (!cancelled) setPreviewErr(e.message || t('embed_invite.fail_preview')); });
    return () => { cancelled = true; };
  }, [code]);

  const handleAccept = useCallback(async () => {
    if (joining) return;
    setJoining(true);
    setJoinErr('');
    try {
      const res = await apiJoinByInvite(code);
      if (res.guild_id) spaNavigate(`/channels/${res.guild_id}`);
    } catch (e) {
      setJoinErr(e.message || t('embed_invite.fail_join'));
      setJoining(false);
    }
  }, [code, joining, t]);

  if (previewErr) {
    return (
      <InviteCardShell accent="var(--accent-danger)">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{t('embed_invite.header_invalid')}</p>
        <p className="text-[12px] text-white/60">{previewErr}</p>
      </InviteCardShell>
    );
  }

  if (!preview) {
    return (
      <InviteCardShell>
        <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
      </InviteCardShell>
    );
  }

  return (
    <InviteCardShell accent={joinErr ? 'var(--accent-danger)' : 'var(--accent)'}>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
        {joinErr ? t('embed_invite.header_unable_join') : preview.is_member ? t('embed_invite.header_member') : t('embed_invite.header_invite')}
      </p>
      <GuildRow preview={preview} />
      {preview.guild_description && !joinErr && (
        <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2">{preview.guild_description}</p>
      )}
      {joinErr ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[rgb(var(--accent-danger-rgb)/0.08)] border border-[rgb(var(--accent-danger-rgb)/0.2)]">
          <svg className="w-4 h-4 text-[rgb(var(--accent-danger-rgb))] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-[12px] text-white/70 leading-snug">{joinErr}</p>
        </div>
      ) : preview.is_member ? (
        <button
          onClick={() => spaNavigate(channelPath(preview.guild_id))}
          className="w-full text-center py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white/85 text-[13px] font-semibold rounded-md transition-colors"
        >
          {t('embed_invite.btn_go_to_server')}
        </button>
      ) : (
        <button
          onClick={handleAccept}
          disabled={joining}
          className="w-full text-center py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {joining ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {t('embed_invite.btn_joining')}
            </>
          ) : t('embed_invite.btn_accept')}
        </button>
      )}
    </InviteCardShell>
  );
}