import React, { useState, useMemo, useEffect } from 'react';
import { apiAddGuildMemberRole, apiRemoveGuildMemberRole } from '../../api/roles';
import UserAvatar from '../user/UserAvatar';
import { CloseIcon } from '../icons';
import { DEFAULT_ROLE_ID } from '../../config';
import { useMemberList } from '../../hooks/useMemberList';
import { usePermEvents } from '../../hooks/usePermEvents';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

export default function RoleMemberManager({ role, onMemberUpdate }) {
  const t = useT();
  const guildId = role?.guild_id;
  const { items: allUsers, loading, loadingMore, hasMore, loadInitial, loadMore, refresh } = useMemberList({
    cacheKey: 'roleManager',
    guildId,
  });
  const [assigning, setAssigning] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  useEffect(() => { loadInitial(); }, []);

  // Refetch when a guild_member_role_update WS event fires so the member
  // list reflects assignments made by other clients (or this client, since
  // the HTTP 200 response doesn't include the updated user row).
  usePermEvents({
    guildMemberRoleUpdate: (data) => {
      if (data?.guild_id === guildId) refresh();
    },
  });

  const members = useMemo(() => allUsers.filter(u => u.roles && u.roles.some(r => r.id === role.id)), [allUsers, role.id]);
  const nonMembers = useMemo(() => allUsers.filter(u =>
    !(u.roles && u.roles.some(r => r.id === role.id)) &&
    u.username.toLowerCase().includes(addSearch.toLowerCase())
  ), [allUsers, role.id, addSearch]);

  const assign = async (userId) => {
    if (!guildId) return;
    setAssigning(userId);
    try {
      await apiAddGuildMemberRole(guildId, userId, role.id);
      refresh();
      if (onMemberUpdate) onMemberUpdate();
    } catch {}
    setAssigning(null);
    setAddSearch('');
  };

  const unassign = async (userId) => {
    if (!guildId) return;
    setAssigning(userId);
    try {
      await apiRemoveGuildMemberRole(guildId, userId, role.id);
      refresh();
      if (onMemberUpdate) onMemberUpdate();
    } catch {}
    setAssigning(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="tw-label">{t('settings_role_members.label_count').replace('{n}', members.length)}</label>
        {role.id !== DEFAULT_ROLE_ID && (
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="text-xs text-white/40 hover:text-white/70 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg px-2.5 py-1 transition-colors font-medium"
          >
            {showSearch ? t('settings_role_members.close') : t('settings_role_members.add')}
          </button>
        )}
      </div>

      {showSearch && (
        <div className="relative">
          <input
            type="text"
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
            placeholder={t('settings_role_members.search_placeholder')}
            className="w-full tw-input px-3 py-2.5"
            autoFocus
          />
          <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-[var(--bg-popover)] border border-white/[0.08] rounded-xl shadow-2xl max-h-56 overflow-y-auto scrollbar-thin">
            {nonMembers.length === 0 ? (
              <p className="text-xs text-white/25 text-center py-3">{t('settings_role_members.no_users')}</p>
            ) : (
              nonMembers.slice(0, 8).map(u => (
                <button
                  key={u.id}
                  onClick={() => assign(u.id)}
                  disabled={assigning === u.id}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left disabled:opacity-40"
                >
                  <UserAvatar username={u.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/60 truncate">{u.username}</p>
                    <p className="text-[10px] text-white/20 truncate">{u.roles ? u.roles.map(r => r.name).join(', ') : t('settings_role_members.no_role')}</p>
                  </div>
                  {assigning === u.id && <div className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-0.5 max-h-72 overflow-y-auto scrollbar-thin" onScroll={(e) => { const el = e.currentTarget; if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMore && !loadingMore) loadMore(); }}>
        {members.length === 0 && (
          <p className="text-sm text-white/20 text-center py-6">{t('settings_role_members.empty')}</p>
        )}
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group">
            <UserAvatar username={m.username} size="sm" />
            <span className="text-sm font-medium text-white/65 truncate flex-1">{m.username}</span>
            {role.id !== DEFAULT_ROLE_ID && (
              <Tooltip text={t('settings_role_members.remove_title')}>
                <button
                  onClick={() => unassign(m.id)}
                  disabled={assigning === m.id}
                  aria-label={t('settings_role_members.remove_title')}
                  className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400/80 transition-all disabled:opacity-40"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </Tooltip>
            )}
          </div>
        ))}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}