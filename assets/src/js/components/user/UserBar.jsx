import React, { useState } from 'react';
import UserAvatar from './UserAvatar';
import UserModal from './UserModal';
import UserProfileModal from './UserProfileModal';
import { ChevronIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';

export default function UserBar({ user, onLogout, navigate, onOpenSettings }) {
  const t = useT();
  const [showModal, setShowModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    setShowModal(false);
    await onLogout();
    navigate(ROUTES.home);
  };

  const openProfile = () => {
    setShowModal(false);
    setShowProfile(true);
  };

  return (
    <div className="flex-shrink-0 bg-[var(--bg-secondary)] border-t border-[var(--border-default)] px-2 py-1.5 relative">
      <button
        onClick={() => setShowModal(!showModal)}
        className="w-full flex items-center gap-2 min-w-0 rounded-md px-2 py-1.5 hover:bg-white/[0.06] transition-colors"
      >
        <UserAvatar username={user?.username} avatarId={user?.avatar_id} userId={user?.id} size="sm" />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[12px] font-medium text-white/80 truncate">{user?.username}</p>
          <p className="text-[10px] text-white/25 leading-tight truncate">{t('user.bar.online')}</p>
        </div>
        <ChevronIcon className={`w-3 h-3 text-white/15 flex-shrink-0 transition-transform duration-200 ${showModal ? 'rotate-180' : ''}`} />
      </button>
      <UserModal
        user={user}
        onLogout={handleLogout}
        navigate={navigate}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onOpenSettings={onOpenSettings}
        onViewProfile={openProfile}
      />
      {showProfile && user?.id && (
        <UserProfileModal
          userId={user.id}
          currentUserId={user.id}
          onClose={() => setShowProfile(false)}
          initialExpanded
        />
      )}
    </div>
  );
}   