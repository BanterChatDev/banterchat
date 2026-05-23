import React from 'react';
import Spinner from '../ui/Spinner';
import { DEFAULT_ROLE_COLOR } from '../../constants';
import { useT } from '../../hooks/useT';
import MemberItem from './MemberItem';

function getDisplayRole(m) {
  if (!m.roles || m.roles.length === 0) return { id: '_none', name: '@everyone', color: DEFAULT_ROLE_COLOR, position: 999 };
  return m.roles[0];
}

export function groupByRole(members) {
  const map = new Map();
  for (const m of members) {
    const r = getDisplayRole(m);
    if (!map.has(r.id)) map.set(r.id, { id: r.id, name: r.name, color: r.color, position: r.position, members: [] });
    map.get(r.id).members.push(m);
  }
  return [...map.values()].sort((a, b) => (a.position || 0) - (b.position || 0));
}

function MemberRow({ member, isTyping, onUserClick, onContextMenu, renderExtra }) {
  return (
    <div className="flex items-center">
      <div className="flex-1 min-w-0">
        <MemberItem member={member} isTyping={isTyping} onUserClick={onUserClick} onContextMenu={onContextMenu} />
      </div>
      {renderExtra?.(member)}
    </div>
  );
}

function GroupHeader({ label, count, color }) {
  return (
    <div className="flex items-baseline gap-1.5 px-2 pt-4 pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
      <span className="text-[11px] text-white/25 font-medium">{count}</span>
    </div>
  );
}

export default function MemberGroupList({ onlineGroups, offline, offlineTotal, hasMore, onUserClick, onContextMenu, loadingMore, renderExtra, typers }) {
  const t = useT();
  const offlineDisplayCount = offlineTotal != null ? offlineTotal : offline.length;
  const showOfflineSection = offlineDisplayCount > 0;
  return (
    <>
      {onlineGroups.map(g => (
        <div key={g.id} className="mb-1">
          <GroupHeader label={g.name} count={g.members.length} color={g.color} />
          {g.members.map(m => (
            <MemberRow key={m.id} member={m} isTyping={!!(typers && typers[m.id])} onUserClick={onUserClick} onContextMenu={onContextMenu} renderExtra={renderExtra} />
          ))}
        </div>
      ))}
      {showOfflineSection && (
        <div className="mb-1">
          <GroupHeader label={t('friends.online_tab.subtext_offline')} count={offlineDisplayCount} color="rgba(255,255,255,0.35)" />
          {offline.map(m => (
            <MemberRow key={m.id} member={m} isTyping={false} onUserClick={onUserClick} onContextMenu={onContextMenu} renderExtra={renderExtra} />
          ))}
          {hasMore && !loadingMore && offline.length < offlineDisplayCount && (
            <div className="text-[10px] text-white/15 text-center py-2">
              {t('channels.members_sidebar.scroll_for_more') || 'Scroll for more'}
            </div>
          )}
        </div>
      )}
      {loadingMore && (
        <div className="flex justify-center py-3">
          <Spinner size="sm" />
        </div>
      )}
    </>
  );
}