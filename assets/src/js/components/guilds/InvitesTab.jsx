import React, { useState } from 'react';
import { apiDeleteInvite } from '../../api/guilds';
import { CopyIcon } from '../icons';
import { CreateInviteModal } from './InviteModal';
import { useInvites } from '../../hooks/useInvites';
import { formatInviteUses } from './inviteUtils';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

export default function InvitesTab({ guildId }) {
  const t = useT();
  const { invites, loading, setInvites } = useInvites(guildId);
  const [createOpen, setCreateOpen] = useState(false);
  const [copied, setCopied] = useState('');

  const handleCreated = (inv) => {
    setInvites(prev => [{ ...inv, uses: 0, created_at: inv.created_at || new Date().toISOString() }, ...(prev || [])]);
  };

  const handleRevoke = async (inv) => {
    if (!confirm(t('guilds.invites_tab_revoke_confirm_template').replace('{code}', inv.code))) return;
    try {
      await apiDeleteInvite(guildId, inv.code);
      setInvites(prev => (prev || []).filter(i => i.id !== inv.id));
    } catch (e) {
      import('../notification/Notifications.jsx').then(m => m.notify(e.message || t('guilds.invites_tab_fail_revoke'), 'error')).catch(() => {});
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white/80">{t('guilds.invites_tab_heading')}</h3>
          <p className="text-[11px] text-white/25 mt-0.5">{t('guilds.invites_tab_subtitle')}</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="tw-btn-accent px-4 py-2 rounded-lg text-[13px]">
          {t('guilds.invites_tab_btn_new')}
        </button>
      </div>

      <CreateInviteModal isOpen={createOpen} onClose={() => setCreateOpen(false)} guildId={guildId} onCreated={handleCreated} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-white/20">{t('guilds.invites_tab_empty_title')}</p>
          <p className="text-[11px] text-white/10 mt-1">{t('guilds.invites_tab_empty_body')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_80px_80px_64px] gap-2 px-3 py-2 text-[10px] font-semibold text-white/20 uppercase tracking-wider">
            <span>{t('guilds.invites_tab_col_code')}</span>
            <span>{t('guilds.invites_tab_col_uses')}</span>
            <span>{t('guilds.invites_tab_col_created')}</span>
            <span></span>
          </div>
          {invites.map(inv => (
            <div key={inv.id} className="grid grid-cols-[1fr_80px_80px_64px] gap-2 items-center px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-[13px] text-white/70 font-mono truncate">{inv.code}</code>
                <Tooltip text={t('guilds.invites_tab_copy_link_title')}>
                  <button onClick={() => copyCode(inv.code)} aria-label={t('guilds.invites_tab_copy_link_title')} className="w-6 h-6 flex items-center justify-center rounded text-white/15 hover:text-white/50 hover:bg-white/[0.06] transition-colors flex-shrink-0">
                    {copied === inv.code ? (
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <CopyIcon className="w-3 h-3" />
                    )}
                  </button>
                </Tooltip>
              </div>
              <span className="text-[12px] text-white/30">{formatInviteUses(inv.uses, inv.max_uses)}</span>
              <span className="text-[11px] text-white/20">{new Date(inv.created_at).toLocaleDateString()}</span>
              <Tooltip text={t('guilds.invites_tab_revoke_title')}>
                <button onClick={() => handleRevoke(inv)} aria-label={t('guilds.invites_tab_revoke_title')} className="text-[11px] text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  {t('guilds.invites_tab_btn_revoke')}
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}