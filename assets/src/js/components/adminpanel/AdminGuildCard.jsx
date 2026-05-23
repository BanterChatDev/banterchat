import React, { useEffect, useState } from 'react';
import { apiAdminGuildDetail, apiAdminTerminateGuild } from '../../api/admin';
import { u } from '../../api/routes';
import Modal, { ModalHeader } from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useT } from '../../hooks/useT';

function Row({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex-shrink-0">{label}</span>
      <span className={`text-[12px] text-white/80 text-right truncate ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

export default function AdminGuildCard({ guildId, onClose, navigate }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(false);
  const [confirmTerm, setConfirmTerm] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    apiAdminGuildDetail(guildId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [guildId]);

  const terminate = async () => {
    setTerminating(true);
    try {
      await apiAdminTerminateGuild(guildId);
      onClose();
    } catch {} finally { setTerminating(false); }
  };

  return (
    <Modal isOpen={!!guildId} onClose={onClose} size="md">
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data ? (
        <p className="text-sm py-6 text-center text-white/40">{t('adminpanel.guild_card_not_found')}</p>
      ) : (
        <>
          <div className="relative -mx-6 -mt-6 mb-4 h-24 overflow-hidden rounded-t-xl">
            {data.banner
              ? <img src={u.guildBanner(data.banner)} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/60" />}
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-[var(--accent)] text-white text-[20px] font-bold -mt-10 ring-4 ring-[var(--bg-deepest)]">
              {data.icon ? <img src={u.guildAvatar(data.icon)} alt="" className="w-full h-full object-cover" /> : data.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] font-bold text-white/90 truncate">{data.name}</h3>
              {data.description && <p className="text-[12px] text-white/50 truncate">{data.description}</p>}
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 mb-4">
            <Row label={t('adminpanel.guild_card_row_owner')} value={t('adminpanel.guild_card_owner_template').replace('{username}', data.owner_username || '?').replace('{short_id}', data.owner_id.slice(0, 12))} />
            <Row label={t('adminpanel.guild_card_row_guild_id')} value={data.id} mono />
            <Row label={t('adminpanel.guild_card_row_members')} value={t('adminpanel.guild_card_members_template').replace('{online}', data.online_count || 0).replace('{total}', data.member_count || 0)} />
            <Row label={t('adminpanel.guild_card_row_banned')} value={data.banned_count} />
            <Row label={t('adminpanel.guild_card_row_channels')} value={data.channel_count || 0} />
            <Row label={t('adminpanel.guild_card_row_messages')} value={(data.message_count || 0).toLocaleString()} />
            <Row label={t('adminpanel.guild_card_row_created')} value={data.created_at} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70">{t('common.close')}</button>
              {data.is_member && (
                <button onClick={() => { navigate(`/channels/${data.id}`); onClose(); }} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">{t('adminpanel.guild_card_btn_open')}</button>
              )}
            </div>
            {confirmTerm ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmTerm(false)} className="flex-1 px-4 py-2 rounded-md text-[12px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70">{t('common.cancel')}</button>
                <button disabled={terminating} onClick={terminate} className="flex-1 px-4 py-2 rounded-md text-[12px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40">
                  {terminating ? t('adminpanel.guild_card_btn_terminating') : t('adminpanel.guild_card_btn_confirm_terminate')}
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmTerm(true)} className="w-full px-4 py-2 rounded-md text-[12px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                {t('adminpanel.guild_card_btn_terminate')}
              </button>
            )}
            </div>
        </>
      )}
    </Modal>
  );
}