import React from 'react';
import { formatDate } from '../user/UserInfo';
import { useT } from '../../hooks/useT';
import { resolveDisplayName } from '../../utils/displayName';

function parseMeta(meta) {
  if (!meta) return {};
  if (typeof meta === 'object') return meta;
  try { return JSON.parse(meta); } catch { return {}; }
}

export default function SystemMessage({ msg, onContextMenu, onUserClick, rowClassName }) {
  const t = useT();
  const SYSTEM_TEXT = {
    user_join: t('messages.system_user_join'),
  };
  const meta = parseMeta(msg.meta);
  const subjectId = meta.user_id || '';
  const subjectName = resolveDisplayName(meta);
  const roleColor = meta.role_color || '';
  const text = SYSTEM_TEXT[msg.system_type] || msg.system_type || t('messages.system_event_fallback');
  const handleNameClick = (e) => {
    if (subjectId && onUserClick) onUserClick(subjectId, e);
  };
  return (
    <div data-message-id={msg.id} onContextMenu={onContextMenu} className={`${rowClassName || ''} flex items-center gap-2 text-[13px] text-white/45 leading-relaxed py-0.5`}>
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      {subjectName ? (
        <button
          type="button"
          onClick={handleNameClick}
          className="font-semibold hover:underline"
          style={{ color: roleColor || 'rgb(255 255 255 / 0.7)' }}
        >
          {subjectName}
        </button>
      ) : (
        <span className="italic text-white/30">{t('messages.system_someone_fallback')}</span>
      )}
      <span>{text}</span>
      <span className="text-[11px] text-white/25 ml-1">{formatDate(msg.created_at)}</span>
    </div>
  );
}