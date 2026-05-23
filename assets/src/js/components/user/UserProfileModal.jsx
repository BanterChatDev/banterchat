import React, { useState, useEffect, useRef } from 'react';
import { apiGetUser } from '../../api/users';
import { apiGetGuildMember } from '../../api/guilds';
import { apiRemoveGuildMemberRole } from '../../api/roles';
import { usePermEvents } from '../../hooks/usePermEvents';
import { createProfileHandlers } from '../../broadcasts';
import { useCache } from '../../hooks/useCache';
import { useGuildMe } from '../../hooks/useGuildMe';
import { useBlocks } from '../../hooks/useBlocks';
import { PERM_MANAGE_ROLES } from '../../permissions/perms';
import { getUserById } from '../mention/userCache';
import RoleAssignPopup from './RoleAssignPopup';
import UserCard from './UserCard';
import MutualsSection from './MutualsSection';
import ProfileMessageInput from './ProfileMessageInput';
import useGuildPreview from '../../hooks/useGuildPreview';
import { getThemeById } from '../../themes';
import { MOBILE_BREAKPOINT } from '../../styles';
import { CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function UserProfileModal({ userId: propUserId, onClose, anchorPos, guildId, currentUserId, initialExpanded = false, elevated = false }) {
  const t = useT();
  const [viewUserId, setViewUserId] = useState(null);
  const { open: handleGuildClick, modal: guildPreviewModal, isOpen: guildPreviewOpen } = useGuildPreview();
  const userId = viewUserId || propUserId;
  useEffect(() => { setViewUserId(null); }, [propUserId]);
  const handleFriendClick = (id) => { if (id && id !== userId) setViewUserId(id); };
  const seed = userId ? getUserById(userId) : null;
  const { data: profile, loading, setData: setProfile } = useCache(
    userId ? `user:${userId}` : null,
    () => apiGetUser(userId),
    { ttl: 60000, initial: seed }
  );
  const [guildMember, setGuildMember] = useState(null);
  const [showRoleAssign, setShowRoleAssign] = useState(false);
  const addRoleBtnRef = useRef(null);
  const { can, data: guildMe } = useGuildMe(guildId, currentUserId);
  const canManageRoles = !!guildId && can(PERM_MANAGE_ROLES);
  const { isBlocked, block, unblock } = useBlocks();
  const blocked = userId ? isBlocked(userId) : false;

  const refetchMember = () => {
    if (!guildId || !userId) return;
    apiGetGuildMember(guildId, userId).then(d => setGuildMember(d)).catch(() => {});
  };

  useEffect(() => {
    if (!guildId || !userId) { setGuildMember(null); return; }
    let cancelled = false;
    apiGetGuildMember(guildId, userId).then(d => { if (!cancelled) setGuildMember(d); }).catch(() => { if (!cancelled) setGuildMember(null); });
    return () => { cancelled = true; };
  }, [guildId, userId]);

  usePermEvents({
    guildMemberRoleUpdate: (payload) => {
      if (payload?.guild_id !== guildId) return;
      if (payload?.user_id !== userId) return;
      refetchMember();
    },
  });

  const removeRole = async (roleId) => {
    try { await apiRemoveGuildMemberRole(guildId, userId, roleId); } catch {}
  };

  const toggleBlock = async () => {
    if (!profile?.username) return;
    try {
      if (blocked) await unblock(profile.username);
      else await block(profile.username);
    } catch {}
  };

  const memberRoles = guildMember?.roles || [];
  const cardRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [expanded, setExpanded] = useState(initialExpanded);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
  const centered = isMobile || expanded;

  useEffect(() => {
    if (centered) { setPos({ x: 0, y: 0 }); return; }
    const el = cardRef.current;
    if (!el) return;
    const clamp = () => {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = anchorPos ? anchorPos.x : vw / 2 - rect.width / 2;
      let y = anchorPos ? anchorPos.y : vh / 2 - rect.height / 2;
      if (x + rect.width > vw - 8) x = vw - rect.width - 8;
      if (x < 8) x = 8;
      if (y + rect.height > vh - 8) y = vh - rect.height - 8;
      if (y < 8) y = 8;
      setPos({ x, y });
    };
    clamp();
    const ro = new ResizeObserver(clamp);
    ro.observe(el);
    return () => ro.disconnect();
  }, [anchorPos, centered]);

  useEffect(() => {
    if (centered) return;
    if (guildPreviewOpen) return;
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, centered, guildPreviewOpen]);

  usePermEvents(createProfileHandlers(userId, setProfile));

  if (!userId) return null;

  const theme = getThemeById(profile?.theme_id || 'dark');
  const v = theme.vars;

  const rolesNode = (
    <div className="flex flex-wrap gap-1 items-center">
      {memberRoles.map(r => (
        <span key={r.id} className="group inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs" style={{ backgroundColor: `rgb(${v.content_base} / 0.06)`, color: `rgb(${v.content_base} / 0.7)` }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color || '#99aab5' }} />
          <span>{r.name}</span>
          {canManageRoles && (
            <button type="button" onClick={() => removeRole(r.id)} className="opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity ml-0.5" title={t('user.profile_modal.remove_role_title')}>
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          )}
        </span>
      ))}
      {canManageRoles && (
        <div className="relative">
          <button ref={addRoleBtnRef} type="button" onClick={() => setShowRoleAssign(x => !x)} className="inline-flex items-center justify-center w-5 h-5 rounded border border-dashed hover:bg-white/[0.06] transition-all" style={{ borderColor: `rgb(${v.content_base} / 0.15)`, color: `rgb(${v.content_base} / 0.5)` }} title={t('user.profile_modal.add_role_title')}>
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          </button>
          {showRoleAssign && (
            <RoleAssignPopup userId={userId} userRoles={memberRoles} guildId={guildId} anchorRef={addRoleBtnRef} onClose={() => setShowRoleAssign(false)} />
          )}
        </div>
      )}
    </div>
  );

  const isSelf = userId === currentUserId;
  const actions = profile && !isSelf && !profile.is_bot ? (
    <div className="flex flex-col gap-2">
      <ProfileMessageInput peerId={userId} peerUsername={profile.username} currentUserId={currentUserId} onClose={onClose} />
      <button
        onClick={toggleBlock}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold bg-white/[0.04] hover:bg-white/[0.1] text-white/60 hover:text-white/90 transition-colors"
      >
        {blocked ? t('user.profile_modal.unblock') : t('user.profile_modal.block')}
      </button>
    </div>
  ) : null;

  const widthClass = expanded
    ? 'w-[calc(100vw-2rem)] max-w-[720px]'
    : isMobile ? 'w-[calc(100vw-2rem)] max-w-[380px]' : 'w-[340px]';
  const showSidePanel = expanded && !isMobile;
  const isSelfForMutuals = userId === currentUserId;
  const mergedProfile = guildMember && profile ? {
    ...profile,
    joined_at: guildMember.joined_at || profile.joined_at,
    display_name: guildMember.nickname || profile.display_name,
  } : profile;
  const userCardNode = (
    <UserCard
      profile={mergedProfile}
      loading={loading}
      memberRoles={memberRoles}
      rolesSlot={{ node: rolesNode, showEmpty: canManageRoles }}
      bannerHeight={expanded ? 160 : 100}
      avatarPx={expanded ? 120 : 80}
      onAvatarClick={!expanded && !isMobile ? () => setExpanded(true) : undefined}
      onUserClick={handleFriendClick}
      onGuildClick={handleGuildClick}
      hideMutuals={showSidePanel}
      guildMe={guildMe}
      currentUserId={currentUserId}
    >
      {actions}
    </UserCard>
  );
  const card = (
    <div
      ref={cardRef}
      className={`rounded-xl shadow-2xl border ${widthClass} max-h-[calc(100vh-4rem)] overflow-hidden relative`}
      style={centered ? { pointerEvents: 'auto', borderColor: v.border_medium } : {
        pointerEvents: 'auto',
        position: 'absolute',
        left: pos ? pos.x : -9999,
        top: pos ? pos.y : -9999,
        opacity: pos ? 1 : 0,
        transition: 'opacity 0.15s ease',
        borderColor: v.border_medium,
      }}
    >
      {expanded && !showSidePanel && (
        <button type="button" onClick={onClose} className="absolute top-3 right-3 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors" aria-label={t('common.close')}>
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
      {showSidePanel ? (
        <div className="flex max-h-[calc(100vh-4rem)]">
          <div className="w-[420px] flex-shrink-0 overflow-y-auto scrollbar-thin">
            {userCardNode}
          </div>
          <div className="flex-1 min-w-0 flex flex-col border-l" style={{ borderColor: v.border_default, backgroundColor: v.bg_secondary }}>
            <div className="flex items-center justify-end px-3 py-2 flex-shrink-0">
              <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors" aria-label={t('common.close')}>
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
              {profile && !isSelfForMutuals && !profile.is_bot ? (
                <MutualsSection userId={userId} currentUserId={currentUserId} dim={(a) => `rgb(${v.content_base} / ${a})`} innerBg={v.bg_tertiary} defaultOpen showEmpty onUserClick={handleFriendClick} onGuildClick={handleGuildClick} />
              ) : (
                <div className="text-[12px] text-center py-6" style={{ color: `rgb(${v.content_base} / 0.35)` }}>
                  {t('user.profile_modal.nothing_to_show')}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto scrollbar-thin max-h-[calc(100vh-4rem)]">
          {userCardNode}
        </div>
      )}
    </div>
  );

  const zClass = elevated ? 'z-[70]' : 'z-50';
  if (centered) {
    return (
      <>
        <div className={`fixed inset-0 ${zClass} bg-black/60 flex items-center justify-center p-4`} onClick={(e) => { if (e.target === e.currentTarget && !guildPreviewOpen) onClose(); }}>
          {card}
        </div>
        {guildPreviewModal}
      </>
    );
  }

  return (
    <>
      <div className={`fixed inset-0 ${zClass}`} style={{ pointerEvents: 'none' }}>
        {card}
      </div>
      {guildPreviewModal}
    </>
  );
}