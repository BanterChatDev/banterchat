import React, { useState } from 'react';
import { apiSendFriendRequest, apiAcceptFriend, apiRemoveFriend } from '../../api/friends';
import { useFriends } from '../../hooks/useFriends';
import { FriendIcon } from '../icons';
import { notify } from '../notification';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

export default function AddFriendButton({ userId, username, className = '', iconOnly = false }) {
  const t = useT();
  const { getStatus } = useFriends();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!username) return null;

  const { status, requestId, friendId } = getStatus(userId);

  const clearErrorLater = () => setTimeout(() => setError(''), 4000);

  const run = async (fn, failMsg) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await fn(); }
    catch (err) {
      const msg = err?.message || failMsg;
      if (iconOnly) notify(msg); else { setError(msg); clearErrorLater(); }
    } finally { setBusy(false); }
  };

  const handleAdd = (e) => { e.stopPropagation(); run(() => apiSendFriendRequest(username), t('user.add_friend.fail_send')); };
  const handleAccept = (e) => { e.stopPropagation(); if (!requestId) return; run(() => apiAcceptFriend(requestId), t('user.add_friend.fail_accept')); };
  const handleRemove = (e) => {
    e.stopPropagation();
    if (!friendId) return;
    run(async () => { await apiRemoveFriend(friendId); notify(t('user.add_friend.removed_notify').replace('{username}', username), 'info'); }, t('user.add_friend.fail_remove'));
  };

  if (iconOnly) {
    let onClick = handleAdd, title = t('user.add_friend.icon_add'), tone = 'bg-black/30 hover:bg-black/50 text-white/70 hover:text-white';
    let disabled = busy;
    if (status === 'friends') { onClick = handleRemove; title = busy ? t('user.add_friend.icon_removing') : t('user.add_friend.icon_friends_remove'); tone = 'bg-emerald-500/20 hover:bg-red-500/30 text-emerald-400 hover:text-red-300'; }
    else if (status === 'outgoing') { onClick = undefined; disabled = true; title = t('user.add_friend.icon_request_sent'); tone = 'bg-white/[0.08] text-white/50 cursor-default'; }
    else if (status === 'incoming') { onClick = handleAccept; title = busy ? t('user.add_friend.icon_accepting') : t('user.add_friend.icon_accept_request'); tone = 'bg-emerald-500 hover:bg-emerald-400 text-white'; }
    return (
      <Tooltip text={title}>
        <button type="button" onClick={onClick} disabled={disabled} aria-label={title} className={`flex items-center justify-center rounded-md transition-colors disabled:opacity-60 disabled:cursor-default ${tone} ${className}`}>
          <FriendIcon status={status} />
        </button>
      </Tooltip>
    );
  }

  let btn;
  if (status === 'friends') {
    btn = (
      <button onClick={handleRemove} disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold bg-emerald-500/15 hover:bg-red-500/20 text-emerald-400 hover:text-red-300 transition-colors disabled:opacity-60 disabled:cursor-wait">
        <FriendIcon status="friends" /> {busy ? t('user.add_friend.btn_removing') : t('user.add_friend.btn_friends')}
      </button>
    );
  } else if (status === 'outgoing') {
    btn = (
      <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold bg-white/[0.06] text-white/50 cursor-default">
        <FriendIcon status="outgoing" /> {t('user.add_friend.btn_request_sent')}
      </button>
    );
  } else if (status === 'incoming') {
    btn = (
      <button onClick={handleAccept} disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors disabled:opacity-60 disabled:cursor-wait">
        <FriendIcon status="incoming" /> {busy ? t('user.add_friend.btn_accepting') : t('user.add_friend.btn_accept_request')}
      </button>
    );
  } else {
    btn = (
      <button onClick={handleAdd} disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-60 disabled:cursor-wait">
        <FriendIcon status="none" /> {busy ? t('user.add_friend.btn_sending') : t('user.add_friend.btn_add_friend')}
      </button>
    );
  }

  return (
    <div className={className}>
      {btn}
      {error && <p className="text-[11px] text-red-400 mt-2 leading-snug">{error}</p>}
    </div>
  );
}