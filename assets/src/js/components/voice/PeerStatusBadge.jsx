import React from 'react';
import { VolumeOffIcon, CameraIcon, ScreenShareIcon } from '../icons';

function MutedMicIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19L5 5M12 18.75C8.83 18.75 6.25 16.17 6.25 13V11M17.75 11v2c0 .64-.1 1.26-.3 1.84M12 18.75V22M8.25 22h7.5M12 1.25a3.75 3.75 0 013.75 3.75v8" />
    </svg>
  );
}

function ServerMutedIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" opacity="0.95" />
      <path d="M16.5 8.5l-9 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 7a2.5 2.5 0 00-2.5 2.5v3.5L14 8.5A2.5 2.5 0 0012 7z" fill="white" opacity="0.85" />
    </svg>
  );
}

export default function PeerStatusBadge({ peer, size = 'md' }) {
  if (!peer) return null;
  const { force_muted, muted, deafened, video_on, screen_on } = peer;
  if (!force_muted && !muted && !deafened && !video_on && !screen_on) return null;

  const dim = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  const inner = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5';
  const icon = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  let body = null;
  if (force_muted) {
    body = (
      <div className={`${inner} text-red-500 flex items-center justify-center`} title="Server muted">
        <ServerMutedIcon className={`${icon}`} />
      </div>
    );
  } else if (deafened) {
    body = (
      <div className={`${inner} bg-red-500 rounded-full flex items-center justify-center`} title="Deafened">
        <VolumeOffIcon className={`${icon} text-white`} />
      </div>
    );
  } else {
    body = (
      <div className={`${inner} bg-red-500 rounded-full flex items-center justify-center`} title="Muted">
        <MutedMicIcon className={`${icon} text-white`} />
      </div>
    );
  }

  const cameraIcon = video_on && (
    <div className={`${dim} bg-[var(--bg-base)] rounded-full flex items-center justify-center shadow-md shadow-black/30`} title="Camera on">
      <CameraIcon className={`${icon} text-[var(--accent)]`} />
    </div>
  );
  const screenIcon = screen_on && (
    <div className={`${dim} bg-[var(--bg-base)] rounded-full flex items-center justify-center shadow-md shadow-black/30`} title="Sharing screen">
      <ScreenShareIcon className={`${icon} text-[var(--accent)]`} />
    </div>
  );

  return (
    <span className="flex items-center gap-1">
      {cameraIcon}
      {screenIcon}
      {body && (
        <div className={`${dim} bg-[var(--bg-base)] rounded-full flex items-center justify-center shadow-md shadow-black/30`}>
          {body}
        </div>
      )}
    </span>
  );
}