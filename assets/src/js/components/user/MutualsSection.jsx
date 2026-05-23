import React, { useEffect, useState } from 'react';
import { apiGetMutuals } from '../../api/users';
import UserAvatar from './UserAvatar';
import { u } from '../../api/routes';
import { ChevronIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { resolveDisplayName } from '../../utils/displayName';
import Tooltip from '../ui/Tooltip';

function CollapsibleSection({ title, count, children, dim, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-1 py-1 text-left transition-colors rounded hover:bg-white/[0.04]"
      >
        <span className="text-[12px] font-semibold" style={{ color: dim(0.7) }}>
          {title} — {count}
        </span>
        <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="mt-1 flex flex-col">{children}</div>}
    </div>
  );
}

function GuildRow({ g, dim, onClick }) {
  const cls = 'flex items-center gap-2.5 rounded px-1.5 py-1.5 hover:bg-white/[0.04] transition-colors w-full text-left';
  const inner = (
    <>
      {g.icon ? (
        <img src={u.guildAvatar(g.icon)} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0" style={{ backgroundColor: `rgb(255 255 255 / 0.08)`, color: dim(0.6) }}>
          {(g.name || '?').slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="text-[13px] truncate" style={{ color: dim(0.85) }}>{g.name}</span>
    </>
  );
  if (onClick) {
    return <Tooltip text={g.name}><button type="button" onClick={() => onClick(g.id)} aria-label={g.name} className={cls}>{inner}</button></Tooltip>;
  }
  return <Tooltip text={g.name}><div className={cls} aria-label={g.name}>{inner}</div></Tooltip>;
}

function FriendRow({ f, dim, onClick }) {
  const cls = 'flex items-center gap-2.5 rounded px-1.5 py-1.5 hover:bg-white/[0.04] transition-colors w-full text-left';
  if (onClick) {
    return (
      <Tooltip text={f.username}>
        <button type="button" onClick={() => onClick(f.id)} aria-label={f.username} className={cls}>
          <UserAvatar username={f.username} avatarId={f.avatar_id} size="md" />
          <span className="text-[13px] truncate" style={{ color: dim(0.85) }}>{resolveDisplayName(f)}</span>
        </button>
      </Tooltip>
    );
  }
  return (
    <Tooltip text={f.username}>
      <div className={cls} aria-label={f.username}>
        <UserAvatar username={f.username} avatarId={f.avatar_id} size="md" />
        <span className="text-[13px] truncate" style={{ color: dim(0.85) }}>{resolveDisplayName(f)}</span>
      </div>
    </Tooltip>
  );
}

export default function MutualsSection({ userId, currentUserId, dim, innerBg, defaultOpen = false, showEmpty = false, onUserClick, onGuildClick }) {
  const t = useT();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId || !currentUserId || userId === currentUserId) { setData(null); return; }
    let cancelled = false;
    apiGetMutuals(userId).then(d => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [userId, currentUserId]);

  if (!data) return null;
  const guilds = data.guilds || [];
  const friends = data.friends || [];
  const isEmpty = guilds.length === 0 && friends.length === 0;
  if (isEmpty && !showEmpty) return null;

  return (
    <div className="rounded-[8px] p-2 mb-3 space-y-2" style={{ backgroundColor: innerBg }}>
      {isEmpty ? (
        <div className="text-[12px] text-center py-4" style={{ color: dim(0.35) }}>
          {t('user.mutuals.empty')}
        </div>
      ) : (
        <>
          {guilds.length > 0 && (
            <CollapsibleSection title={t('user.mutuals.section_servers')} count={guilds.length} dim={dim} defaultOpen={defaultOpen}>
              {guilds.map(g => <GuildRow key={g.id} g={g} dim={dim} onClick={onGuildClick} />)}
            </CollapsibleSection>
          )}
          {guilds.length > 0 && friends.length > 0 && (
            <div className="h-px" style={{ backgroundColor: dim(0.06) }} />
          )}
          {friends.length > 0 && (
            <CollapsibleSection title={t('user.mutuals.section_friends')} count={friends.length} dim={dim} defaultOpen={defaultOpen}>
              {friends.map(f => <FriendRow key={f.id} f={f} dim={dim} onClick={onUserClick} />)}
            </CollapsibleSection>
          )}
        </>
      )}
    </div>
  );
}