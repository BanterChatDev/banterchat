import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiUnbanGuildMember } from '../../api/guilds';
import { hasPerm, PERM_BAN_MEMBERS, PERM_KICK_MEMBERS, PERM_ADMINISTRATOR, getTopRolePosition } from '../../permissions';
import { useMemberList } from '../../hooks/useMemberList';
import { useGuildMe } from '../../hooks/useGuildMe';
import { useContextMenu } from '../contextmenu';
import { CloseIcon, SearchIcon, MoreIcon } from '../icons';
import UserAvatar from '../user/UserAvatar';
import { AvatarWithStatus } from '../status';
import BotBadge from '../ui/BotBadge';
import Spinner from '../ui/Spinner';
import { resolveNameColor } from '../../utils/userColor';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

function MemberCard({ member, isOnline, isBanned, canBan, actionLoading, onUnban, onContext, onProfile, guildMe, guild, currentUserId }) {
  const t = useT();
  const isSelf = member.id === currentUserId;
  const ctx = { memberActions: true, targetUser: { id: member.id, username: member.username, is_bot: !!member.is_bot }, guildMe, guild };
  return (
    <div
      onClick={() => onProfile?.(member.id)}
      onContextMenu={(e) => { if (isSelf) return; onContext(e, ctx); }}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150
        ${isBanned ? 'bg-[rgb(var(--accent-danger-rgb)/0.04)] border border-[rgb(var(--accent-danger-rgb)/0.1)]' : 'hover:bg-white/[0.04] border border-transparent'}
      `}
    >
      <AvatarWithStatus online={isOnline} size="xs">
        <UserAvatar username={member.username} avatarId={member.avatar_id} size="sm" />
      </AvatarWithStatus>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium truncate" style={{ color: resolveNameColor({ source: member, isDM: false, fallback: 'var(--text-primary)' }) }}>
            {member.username}
          </span>
          {member.is_bot && <BotBadge className="ml-0.5" />}
          {hasPerm(member.permissions, PERM_ADMINISTRATOR) && (
            <span className="text-[9px] font-bold text-[rgb(var(--accent-warning-rgb)/0.7)] bg-[rgb(var(--accent-warning-rgb)/0.1)] rounded px-1.5 py-0.5 uppercase tracking-wider leading-none">{t('settings_members.badge_admin')}</span>
          )}
          {isBanned && (
            <span className="text-[9px] font-bold text-[rgb(var(--accent-danger-rgb)/0.8)] bg-[rgb(var(--accent-danger-rgb)/0.1)] rounded px-1.5 py-0.5 uppercase tracking-wider leading-none">{t('settings_members.badge_banned')}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {member.roles?.[0] && (
            <span className="text-[10px] font-medium truncate" style={{ color: member.roles[0].color + '80' }}>{member.roles[0].name}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isBanned ? (
          canBan && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnban(member.id); }}
              disabled={actionLoading === member.id}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all disabled:opacity-30 text-[var(--accent-success)] bg-[rgb(var(--accent-success-rgb)/0.1)] hover:bg-[rgb(var(--accent-success-rgb)/0.2)] sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
            >
              {actionLoading === member.id ? t('settings_members.action_loading') : t('settings_members.action_unban')}
            </button>
          )
        ) : !isSelf && (
          <Tooltip text={t('settings_members.more_actions')}>
            <button
              onClick={(e) => { e.stopPropagation(); onContext(e, ctx); }}
              aria-label={t('settings_members.more_actions')}
              className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors sm:opacity-0 sm:group-hover:opacity-100"
            >
              <MoreIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[var(--bg-tertiary)] rounded-lg px-4 py-3 border border-[var(--border-default)]">
      <p className="text-[20px] font-bold" style={color ? { color } : { color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

export default function MembersTab({ user, guildId, guild }) {
  const t = useT();
  const { data: guildMe } = useGuildMe(guildId, user?.id);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const listRef = useRef(null);
  const { openMenu } = useContextMenu();

  const guildPerms = guildMe?.permissions || 0;
  const canBan = guildMe?.is_owner || hasPerm(guildPerms, PERM_BAN_MEMBERS) || hasPerm(guildPerms, PERM_ADMINISTRATOR);
  const canKick = guildMe?.is_owner || hasPerm(guildPerms, PERM_KICK_MEMBERS) || hasPerm(guildPerms, PERM_ADMINISTRATOR);
  const { items: members, loading, loadingMore, hasMore, total: memberTotal, onlineCount, search, handleSearch, clearSearch, loadInitial, loadMore } = useMemberList({ syncOnline: true, includeBanned: false, guildId });

  useEffect(() => { loadInitial(); }, []);

  const handleUnban = async (id) => {
    setError('');
    setActionLoading(id);
    try { await apiUnbanGuildMember(guildId, id); } catch (e) { setError(e.message); }
    setActionLoading(null);
  };

  const userTopPos = getTopRolePosition(guildMe);

  const filtered = useMemo(() => {
    if (filter === 'online') return members.filter(m => m.online);
    if (filter === 'offline') return members.filter(m => !m.online);
    return members;
  }, [members, filter]);

  const handleProfile = (id) => {
    window.dispatchEvent(new CustomEvent('openProfileFromSettings', { detail: { userId: id } }));
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Spinner /></div>;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 shrink-0">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label={t('settings_members.stat_total')} value={memberTotal ?? members.length} />
        <StatCard label={t('settings_members.stat_online')} value={onlineCount ?? 0} color="var(--accent-success)" />
        <StatCard label={t('settings_members.stat_offline')} value={memberTotal != null && onlineCount != null ? memberTotal - onlineCount : 0} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
          <input type="text" value={search} onChange={handleSearch} placeholder={t('settings_members.search_placeholder')} className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg pl-9 pr-8 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-[var(--border-focus)] transition-colors" />
          {search && <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"><CloseIcon className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {['all', 'online', 'offline'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${
                filter === f
                  ? 'bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)]'
                  : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
              }`}
            >
              {t('settings_members.filter_' + f)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-[rgb(var(--accent-danger-rgb)/0.1)] border border-[rgb(var(--accent-danger-rgb)/0.2)] rounded-lg px-3 py-2 mb-4"><p className="text-xs text-[var(--accent-danger)]">{error}</p></div>}
      </div>

      <div ref={listRef} onScroll={() => { const el = listRef.current; if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMore && !loadingMore) loadMore(); }} className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-4 sm:px-6 pb-4 sm:pb-6 space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-[12px] text-white/20 text-center py-8">{t('settings_members.empty')}</p>
        ) : (
          filtered.map(m => {
            const rankOK = m.id !== user.id && getTopRolePosition(m) > userTopPos;
            return (
              <MemberCard
                key={m.id}
                member={m}
                isOnline={m.online}
                isBanned={m.banned}
                canBan={canBan && rankOK}
                onUnban={handleUnban}
                actionLoading={actionLoading}
                onContext={openMenu}
                onProfile={handleProfile}
                guildMe={{ ...guildMe, guild_id: guildId }}
                guild={guild}
                currentUserId={user.id}
              />
            );
          })
        )}
        {loadingMore && <div className="flex justify-center py-3"><Spinner size="sm" /></div>}
      </div>
    </div>
  );
}