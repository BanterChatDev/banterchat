import React from 'react';
import UserAvatar from '../user/UserAvatar';
import { Markdown } from '../markdown';
import { u } from '../../api/routes';
import { useT } from '../../hooks/useT';

function MessageCard({ s, onUserClick }) {
  const t = useT();
  const click = (e) => {
    if (!s.author_id || !onUserClick) return;
    e.stopPropagation();
    onUserClick(s.author_id, e);
  };
  const clickable = !!s.author_id && !!onUserClick;
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
      <div onClick={clickable ? click : undefined} className={clickable ? 'cursor-pointer' : ''}>
        <UserAvatar username={s.username} avatarId={s.avatar_id} userId={s.author_id} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            onClick={clickable ? click : undefined}
            className={`text-[12px] font-semibold text-white/85 truncate ${clickable ? 'cursor-pointer hover:underline' : ''}`}
          >
            {s.username || t('adminpanel.report_card_unknown_user')}
          </span>
          {s.created_at && <span className="text-[10px] text-white/30 tabular-nums">{new Date(s.created_at).toLocaleString()}</span>}
        </div>
        <div className="text-[13px] text-white/70 leading-relaxed break-words whitespace-pre-wrap">
          {s.content ? <Markdown text={s.content} /> : <span className="text-white/25 italic">{t('adminpanel.report_card_empty_message')}</span>}
        </div>
      </div>
    </div>
  );
}

function UserTargetCard({ s, targetId, onUserClick }) {
  const t = useT();
  const click = (e) => {
    if (!targetId || !onUserClick) return;
    e.stopPropagation();
    onUserClick(targetId, e);
  };
  const clickable = !!targetId && !!onUserClick;
  return (
    <div
      onClick={clickable ? click : undefined}
      className={`flex gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)] ${clickable ? 'cursor-pointer hover:bg-white/[0.04] transition-colors' : ''}`}
    >
      <UserAvatar username={s.username} avatarId={s.avatar_id} userId={targetId} size="md" />
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-semibold text-white/85 truncate mb-1 ${clickable ? 'hover:underline' : ''}`}>{s.username || t('adminpanel.report_card_unknown_user')}</p>
        {s.bio
          ? <div className="text-[12px] text-white/55 leading-relaxed break-words"><Markdown text={s.bio} /></div>
          : <p className="text-[11px] italic text-white/30">{t('adminpanel.report_card_no_bio')}</p>}
      </div>
    </div>
  );
}

function GuildCard({ s, targetId, onGuildClick }) {
  const t = useT();
  const click = (e) => {
    if (!targetId || !onGuildClick) return;
    e.stopPropagation();
    onGuildClick(targetId);
  };
  const clickable = !!targetId && !!onGuildClick;
  return (
    <div
      onClick={clickable ? click : undefined}
      className={`flex gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)] items-center ${clickable ? 'cursor-pointer hover:bg-white/[0.04] transition-colors' : ''}`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-[var(--accent)] text-white text-[14px] font-bold">
        {s.icon ? <img src={u.guildAvatar(s.icon)} alt="" className="w-full h-full object-cover" /> : (s.name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-semibold text-white/85 truncate ${clickable ? 'hover:underline' : ''}`}>{s.name || t('adminpanel.report_card_unknown_guild')}</p>
        <p className="text-[11px] text-white/40 truncate">
          {t('adminpanel.report_card_guild_meta_template').replace('{members}', s.member_count ?? 0).replace('{owner}', s.owner_username || s.owner_id?.slice(0, 12) || '?')}
        </p>
      </div>
    </div>
  );
}

export default function ReportTargetCard({ targetType, targetId, snapshot, onUserClick, onGuildClick }) {
  const t = useT();
  if (!snapshot) return null;
  if (snapshot.deleted) {
    return (
      <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-[12px] italic text-white/30">
        {t('adminpanel.report_card_target_deleted')}
      </div>
    );
  }
  if (targetType === 'message') return <MessageCard s={snapshot} onUserClick={onUserClick} />;
  if (targetType === 'user') return <UserTargetCard s={snapshot} targetId={targetId} onUserClick={onUserClick} />;
  if (targetType === 'guild') return <GuildCard s={snapshot} targetId={targetId} onGuildClick={onGuildClick} />;
  return null;
}