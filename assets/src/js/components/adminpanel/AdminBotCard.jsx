import React, { useEffect, useState } from 'react';
import { apiAdminBotDetail } from '../../api/admin';
import { apiTerminateUser, apiRestoreUser } from '../../api/users';
import Modal, { ModalHeader } from '../ui/Modal';
import Spinner from '../ui/Spinner';
import UserAvatar from '../user/UserAvatar';
import { useT } from '../../hooks/useT';

function Row({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex-shrink-0">{label}</span>
      <span className={`text-[12px] text-white/80 text-right truncate ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

export default function AdminBotCard({ appId, onClose, onOpenOwner }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appId) { setData(null); return; }
    setLoading(true);
    apiAdminBotDetail(appId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [appId]);

  const terminate = async () => {
    if (!data) return;
    setBusy(true);
    try { await apiTerminateUser(data.bot_user_id, ''); onClose(); } catch {} finally { setBusy(false); }
  };

  const restore = async () => {
    if (!data) return;
    setBusy(true);
    try { await apiRestoreUser(data.bot_user_id); onClose(); } catch {} finally { setBusy(false); }
  };

  return (
    <Modal isOpen={!!appId} onClose={onClose} size="md">
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data ? (
        <p className="text-sm py-6 text-center text-white/40">{t('adminpanel.bot_card_not_found')}</p>
      ) : (
        <>
          <ModalHeader
            icon={<UserAvatar username={data.name} avatarId={data.avatar_id} userId={data.bot_user_id} size="md" />}
            title={data.name}
            subtitle={data.description || t('adminpanel.bot_card_no_description')}
          />
          <div className="mt-3 mb-4">
            <Row label={t('adminpanel.bot_card_row_owner')} value={
              <button onClick={() => onOpenOwner?.(data.owner_id)} className="text-white/80 hover:text-white/100 hover:underline">
                @{data.owner_username || data.owner_id.slice(0, 12)}
              </button>
            } />
            <Row label={t('adminpanel.bot_card_row_app_id')} mono value={data.id} />
            <Row label={t('adminpanel.bot_card_row_bot_user_id')} mono value={data.bot_user_id} />
            <Row label={t('adminpanel.bot_card_row_guilds')} value={data.guild_count} />
            <Row label={t('adminpanel.bot_card_row_verified')} value={data.verified ? t('adminpanel.bot_card_yes') : t('adminpanel.bot_card_no')} />
            <Row label={t('adminpanel.bot_card_row_status')} value={
              data.banned
                ? <span className="text-red-400">{t('settings_members.badge_banned')}</span>
                : data.online
                  ? <span className="text-emerald-400">{t('friends.online_tab.subtext_online')}</span>
                  : <span className="text-white/40">{t('friends.online_tab.subtext_offline')}</span>
            } />
            <Row label={t('adminpanel.bot_card_row_created')} value={data.created_at} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
            {data.banned ? (
              <button
                disabled={busy}
                onClick={restore}
                className="text-[12px] font-semibold px-3 py-1.5 rounded bg-white/[0.08] hover:bg-white/[0.14] text-white/80 disabled:opacity-40"
              >
                {busy ? '…' : t('adminpanel.bot_card_btn_restore')}
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={terminate}
                className="text-[12px] font-semibold px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 disabled:opacity-40"
              >
                {busy ? '…' : t('adminpanel.bot_card_btn_terminate')}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}