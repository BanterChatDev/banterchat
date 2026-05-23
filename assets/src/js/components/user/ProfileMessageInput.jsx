import React, { useState } from 'react';
import { apiGetOrCreateDM } from '../../api/dms';
import { notify } from '../notification';
import { useT } from '../../hooks/useT';

export default function ProfileMessageInput({ peerId, peerUsername, currentUserId, onClose }) {
  const t = useT();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const content = value.trim();
    if (!content || busy || !peerId) return;
    setBusy(true);
    try {
      const conv = await apiGetOrCreateDM(peerId);
      if (!conv?.id) throw new Error(t('user.message_input.fail_open_dm'));
      const status = window.__wsSend?.({
        type: 'message_send',
        payload: { channel_id: conv.id, content, attachment_ids: [], reply_to: '' },
      });
      if (status === false) throw new Error(t('user.message_input.fail_not_connected'));
      setValue('');
      onClose?.();
      if (currentUserId) {
        window.history.pushState({}, '', `/messages/${currentUserId}/${peerId}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (err) {
      notify(err?.message || t('user.message_input.fail_send'));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={busy}
      maxLength={2000}
      placeholder={t('user.message_input.placeholder').replace('{username}', peerUsername || t('user.message_input.user_fallback'))}
      className="w-full rounded-md bg-[var(--bg-input)] border border-white/[0.06] focus:border-white/[0.12] outline-none text-[13px] text-white/85 placeholder-white/30 px-3 py-2 transition-colors disabled:opacity-60"
    />
  );
}