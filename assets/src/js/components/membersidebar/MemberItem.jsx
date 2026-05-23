import React from 'react';
import UserAvatar from '../user/UserAvatar';
import { AvatarWithStatus, resolveStatus } from '../status';
import BotBadge from '../ui/BotBadge';
import TypingDots from '../typing/TypingDots';
import { resolveNameColor, NEUTRAL_NAME_COLOR_DIM } from '../../utils/userColor';
import { resolveDisplayName } from '../../utils/displayName';

const MemberItem = React.memo(function MemberItem({ member, isTyping, onUserClick, onContextMenu }) {
  const nameColor = resolveNameColor({ source: member, isDM: false, fallback: NEUTRAL_NAME_COLOR_DIM });
  const isOffline = resolveStatus(member.presence_status, member.online) === 'offline';
  return (
    <button
      onClick={(e) => { onUserClick?.(member.id, e); }}
      onContextMenu={(e) => onContextMenu(e, { targetUser: { id: member.id, username: member.username, display_name: member.display_name } })}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors duration-150
        ${isOffline ? 'opacity-40 hover:opacity-75 hover:bg-white/[0.04]' : 'hover:bg-white/[0.06] active:bg-white/[0.09]'}`}
    >
      <AvatarWithStatus online={member.online} status={member.presence_status} size="xs">
        <UserAvatar username={member.username} avatarId={member.avatar_id} size="md" />
      </AvatarWithStatus>
      <div className="min-w-0 flex-1 flex items-center gap-1.5">
        <span className="text-[13px] font-medium truncate leading-tight" style={{ color: nameColor }}>
          {resolveDisplayName(member)}
        </span>
        {member.is_bot && <BotBadge className="shrink-0" />}
        {isTyping && <TypingDots size="sm" />}
      </div>
    </button>
  );
}, (prev, next) => prev.member === next.member && prev.isTyping === next.isTyping);

export default MemberItem;