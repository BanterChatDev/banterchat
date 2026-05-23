import React from 'react';
import UserAvatar from '../user/UserAvatar';
import { AvatarWithStatus } from '../status';

export default function FriendRow({ avatar, username, subtext, online, actions }) {
  return (
    <div className="group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/[0.04] transition-colors border-t border-white/[0.04] first:border-t-0 cursor-default">
      <AvatarWithStatus online={!!online} size="sm">
        <UserAvatar username={username} avatarId={avatar} size="lg" />
      </AvatarWithStatus>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white/85 truncate leading-tight">{username}</p>
        <p className="text-[12px] text-white/30 leading-tight mt-0.5">{subtext}</p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {actions}
      </div>
    </div>
  );
}