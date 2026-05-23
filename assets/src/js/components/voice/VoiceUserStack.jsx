import React from 'react';
import UserAvatar from '../user/UserAvatar';
import PeerStatusBadge from './PeerStatusBadge';
import { isPeerSpeaking } from './peerSpeaking';

export default function VoiceUserStack({ peers, speakingByUserId, onUserClick }) {
  if (!peers || peers.length === 0) return null;
  return (
    <div className="ml-5 space-y-px mb-1">
      {peers.map(p => {
        const isSpeaking = isPeerSpeaking(p, speakingByUserId);
        return (
          <button
            key={p.user_id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onUserClick) onUserClick(p.user_id, e);
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] text-white/45 hover:bg-white/[0.04] hover:text-white/70 transition-colors text-left"
          >
            <div className={`rounded-full p-px transition-shadow duration-150 ${
              isSpeaking ? 'ring-2 ring-[var(--accent-success)]' : 'ring-2 ring-transparent'
            }`}>
              <UserAvatar username={p.username} userId={p.user_id} size="sm" />
            </div>
            <span className="truncate">{p.username}</span>
            <span className="ml-auto flex items-center gap-1">
              {isSpeaking && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)] animate-pulse" aria-hidden="true" />
              )}
              <PeerStatusBadge peer={p} size="sm" />
            </span>
          </button>
        );
      })}
    </div>
  );
}