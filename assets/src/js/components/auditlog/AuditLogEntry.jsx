import React from 'react';
import UserAvatar from '../user/UserAvatar';
import { templateKeyForAction } from './actionTemplates';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

function smartTime(iso, t) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 60) return t('auditlog.time.just_now');
  if (sec < 3600) return t('auditlog.time.minutes_ago_template').replace('{n}', Math.floor(sec / 60));
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return t('auditlog.time.today_at_template').replace('{time}', time);
  if (isYesterday) return t('auditlog.time.yesterday_at_template').replace('{time}', time);
  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time;
  }
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function ActorName({ user, fallbackId, fallbackText }) {
  if (!user) return <Tooltip text={fallbackId || ''} disabled={!fallbackId}><span className="font-semibold text-white/55" aria-label={fallbackId || undefined}>{fallbackText}</span></Tooltip>;
  return <span className="font-semibold text-white/95">{user.username}</span>;
}

function TargetName({ user, fallbackId, fallbackText }) {
  if (!user) return <Tooltip text={fallbackId || ''} disabled={!fallbackId}><span className="font-semibold text-white/55" aria-label={fallbackId || undefined}>{fallbackText}</span></Tooltip>;
  return <span className="font-semibold text-white/85">{user.username}</span>;
}

function MetaChip({ value }) {
  return <span className="font-mono text-[11.5px] px-1.5 py-0 rounded bg-white/[0.07] text-white/85 align-baseline">{value}</span>;
}

function renderTemplate(tpl, parts) {
  const out = [];
  const re = /\{([a-z_]+)\}/g;
  let last = 0;
  let m;
  let key = 0;
  while ((m = re.exec(tpl)) !== null) {
    if (m.index > last) out.push(<React.Fragment key={key++}>{tpl.slice(last, m.index)}</React.Fragment>);
    const slot = m[1];
    out.push(<React.Fragment key={key++}>{parts[slot] ?? `{${slot}}`}</React.Fragment>);
    last = m.index + m[0].length;
  }
  if (last < tpl.length) out.push(<React.Fragment key={key++}>{tpl.slice(last)}</React.Fragment>);
  return out;
}

const RENDERED_META_KEYS = new Set(['name', 'role_name', 'severity', 'until', 'to_user_id']);

function hasExtraMetadata(meta) {
  if (!meta) return false;
  for (const k of Object.keys(meta)) {
    if (!RENDERED_META_KEYS.has(k)) return true;
  }
  return false;
}

export default function AuditLogEntry({ entry }) {
  const t = useT();
  const tplKey = templateKeyForAction(entry.action);
  const tpl = t(tplKey);
  const meta = entry.metadata || {};
  const actor = entry.actor;

  const parts = {
    actor: <ActorName user={actor} fallbackId={entry.actor_id} fallbackText={t('auditlog.placeholder.unknown_actor')} />,
    target: <TargetName user={entry.target_user} fallbackId={entry.target_id} fallbackText={t('auditlog.placeholder.unknown_user')} />,
    name: meta.name ? <MetaChip value={meta.name} /> : <span className="text-white/35 italic">{t('auditlog.placeholder.no_name')}</span>,
    role_name: meta.role_name ? <MetaChip value={meta.role_name} /> : <span className="text-white/35 italic">{t('auditlog.placeholder.no_name')}</span>,
    severity: meta.severity != null ? <MetaChip value={String(meta.severity)} /> : null,
    until: meta.until ? <MetaChip value={new Date(meta.until).toLocaleString()} /> : null,
    new_owner: meta.to_user_id ? <MetaChip value={meta.to_user_id} /> : null,
  };

  const showMetaToggle = hasExtraMetadata(meta);

  return (
    <div className="flex items-start gap-3.5 px-4 py-3 border-b border-white/[0.025] hover:bg-white/[0.02] last:border-b-0">
      <div className="shrink-0 pt-0.5">
        {actor ? (
          <UserAvatar username={actor.username} avatarId={actor.avatar_id} userId={actor.id} size="sm" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[13.5px] text-white/65 leading-snug min-w-0 break-words">
            {renderTemplate(tpl, parts)}
          </div>
          <Tooltip text={new Date(entry.created_at).toLocaleString()}>
            <div className="text-[11px] text-white/35 tabular-nums shrink-0" aria-label={new Date(entry.created_at).toLocaleString()}>
              {smartTime(entry.created_at, t)}
            </div>
          </Tooltip>
        </div>
        {entry.reason && (
          <div className="mt-1 text-[12px] text-white/50 break-words border-l-2 border-white/[0.08] pl-2.5">
            <span className="text-white/35">{t('auditlog.reason_label')}</span> {entry.reason}
          </div>
        )}
        {showMetaToggle && (
          <details className="mt-1">
            <summary className="text-[10px] text-white/25 cursor-pointer hover:text-white/45 list-none select-none">{t('auditlog.metadata_summary')}</summary>
            <pre className="text-[10px] text-white/40 mt-1 p-2 rounded bg-black/20 overflow-x-auto">{JSON.stringify(meta, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}