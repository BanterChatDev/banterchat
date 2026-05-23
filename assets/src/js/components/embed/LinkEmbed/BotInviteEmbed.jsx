import React, { useEffect, useState } from 'react';
import { EmbedCard } from './shared';
import { getOauth2AppInfo } from '../../../api/developers';
import { u } from '../../../api/routes';
import BotInviteModal from '../../modals/BotInviteModal';
import { useT } from '../../../hooks/useT';

function BotRow({ app }) {
  const t = useT();
  const tag = app.discriminator ? `#${app.discriminator}` : '';
  const initial = (app.name || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
        style={{ background: app.avatar_id ? 'transparent' : 'var(--accent)' }}
      >
        {app.avatar_id ? (
          <img src={u.avatar(app.avatar_id)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-semibold">{initial}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-white/90 truncate">
          {app.name}
          {tag && <span className="text-white/35 font-normal ml-1">{tag}</span>}
        </p>
        <p className="text-[11px] text-white/40">{t('embed_invite.bot_subtitle')}</p>
      </div>
    </div>
  );
}

function Shell({ children, accent = 'var(--accent)' }) {
  return (
    <EmbedCard accent={accent}>
      <div className="p-3 space-y-2.5">{children}</div>
    </EmbedCard>
  );
}

export default function BotInviteEmbed({ clientID, url }) {
  const t = useT();
  const [app, setApp] = useState(null);
  const [err, setErr] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [permBits, setPermBits] = useState(0n);

  useEffect(() => {
    let cancelled = false;
    getOauth2AppInfo(clientID)
      .then(a => { if (!cancelled) setApp(a); })
      .catch(e => { if (!cancelled) setErr(e.message || t('embed_invite.bot_fail_load')); });
    return () => { cancelled = true; };
  }, [clientID]);

  useEffect(() => {
    try {
      const parsed = new URL(url);
      const raw = parsed.searchParams.get('permissions') || '0';
      setPermBits(BigInt(raw));
    } catch {
      setPermBits(0n);
    }
  }, [url]);

  const handleAdd = () => {
    setModalOpen(true);
  };

  if (err) {
    return (
      <Shell accent="var(--accent-danger)">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{t('embed_invite.bot_header_unavailable')}</p>
        <p className="text-[12px] text-white/60">{err}</p>
      </Shell>
    );
  }

  if (!app) {
    return (
      <Shell>
        <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{t('embed_invite.bot_header_invite')}</p>
        <BotRow app={app} />
        {app.description && (
          <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2">{app.description}</p>
        )}
        <button
          onClick={handleAdd}
          className="w-full text-center py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold rounded-md transition-colors"
        >
          {t('embed_invite.bot_btn_add')}
        </button>
      </Shell>
      <BotInviteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        clientID={clientID}
        permissionsBits={permBits}
      />
    </>
  );
}