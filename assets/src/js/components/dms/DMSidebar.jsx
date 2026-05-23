import React from 'react';
import UserAvatar from '../user/UserAvatar';
import { AvatarWithStatus } from '../status';
import ChannelBadge from '../channels/ChannelBadge';
import ChannelUnreadBar from '../channels/ChannelUnreadBar';
import { FriendIcon, CloseIcon } from '../icons';
import { useContextMenu } from '../contextmenu';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { apiCloseDM } from '../../api/dms';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

export default function DMSidebar({
  convos, onlineMap, unread, mentions,
  activeDmPeerId, onSelect,
  fullWidth, width,
  friendsActive, pendingCount, onFriendsClick,
}) {
  const t = useT();
  const hasConvos = convos && convos.length > 0;
  const { openMenu } = useContextMenu();
  const { markChannelRead } = useChannelNotifications();

  return (
    <div className={`flex flex-shrink-0 bg-[var(--bg-secondary)] flex-col ${fullWidth ? 'w-full h-full' : 'border-r border-white/[0.04]'}`} style={!fullWidth && width ? { width } : undefined}>
      {onFriendsClick && (
        <button
          onClick={onFriendsClick}
          className={`mx-1.5 mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
            friendsActive
              ? 'bg-white/[0.1] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
          }`}
        >
          <FriendIcon className="w-4 h-4" />
          <span className="flex-1 text-left">{t('friends.view.header')}</span>
          {pendingCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>
      )}

      <div className="px-3 mt-3 mb-1 text-[10px] font-bold text-white/30 uppercase tracking-[0.08em]">
        {t('dms.sidebar.header')}
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 pt-1">
        {!hasConvos ? (
          <p className="text-[12px] text-white/20 text-center py-4 px-2">
            {t('dms.sidebar.empty')}
          </p>
        ) : (
        <div className="space-y-px">
          {convos.map(c => {
            const isActive = c.peer_id === activeDmPeerId;
            const count = unread?.[c.id] || 0;
            const hasUnread = !isActive && count > 0;
            const mentionCount = mentions?.[c.id] || 0;
            const hasMention = !isActive && mentionCount > 0;
            return (
              <Tooltip key={c.id} text={c.peer_username} placement="right">
                <div
                  onClick={() => onSelect(c.peer_id)}
                  onContextMenu={(e) => openMenu(e, { dm: c, markChannelRead })}
                  aria-label={c.peer_username}
                  role="button"
                  tabIndex={0}
                  className={`group/ch w-full text-left px-2 py-[7px] rounded-md text-[14px] transition-colors duration-100 flex items-center gap-2.5 relative cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.1] text-white'
                      : hasUnread
                        ? 'text-white/95 hover:bg-white/[0.06]'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/[0.06]'
                  }`}
                >
                  <ChannelUnreadBar visible={hasUnread} />
                  <div className="w-8 h-8 flex-shrink-0">
                    <AvatarWithStatus online={onlineMap[c.peer_id] === true} size="sm">
                      <UserAvatar username={c.peer_username} avatarId={c.peer_avatar} size="md" />
                    </AvatarWithStatus>
                  </div>
                  <span className="truncate flex-1 font-medium">{c.peer_username}</span>
                  {hasMention && !isActive ? (
                    <ChannelBadge count={mentionCount} />
                  ) : (
                    <Tooltip text={t('dms.sidebar.close_title')}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); apiCloseDM(c.peer_id).catch(() => {}); }}
                        className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded text-white/30 hover:text-white/80 hover:bg-white/[0.08] opacity-0 group-hover/ch:opacity-100 transition-opacity"
                        aria-label={t('dms.sidebar.close_title')}
                      >
                        <CloseIcon className="w-3 h-3" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}