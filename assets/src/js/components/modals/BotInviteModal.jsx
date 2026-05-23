import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { getOauth2AppInfo, listManageableGuilds, oauth2Authorize } from '../../api/developers';
import { ALL_PERMISSIONS } from '../../config';
import { u } from '../../api/routes';
import { emit } from '../../eventBus';
import { useT } from '../../hooks/useT';
import SearchableSelect from '../ui/SearchableSelect';

function BotAvatars({ app }) {
  const initial = (app.name || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center justify-center gap-fluid-3 mb-fluid-3">
      <div
        className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
        style={{ background: app.avatar_id ? 'transparent' : 'var(--accent)' }}
      >
        {app.avatar_id ? (
          <img src={u.avatar(app.avatar_id)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-2xl font-semibold">{initial}</div>
        )}
      </div>
    </div>
  );
}

function PermissionRow({ name, granted }) {
  return (
    <div className="flex items-center gap-fluid-3 py-fluid-2">
      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${granted ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-white/5 text-white/30'}`}>
        {granted ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        )}
      </div>
      <span className={`text-[13px] ${granted ? 'text-white/90' : 'text-white/40'}`}>{name}</span>
    </div>
  );
}

export default function BotInviteModal({ isOpen, onClose, clientID, permissionsBits = 0n }) {
  const t = useT();
  const [app, setApp] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen || !clientID) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    setDone(false);
    Promise.all([getOauth2AppInfo(clientID), listManageableGuilds()])
      .then(([a, gs]) => {
        if (cancelled) return;
        setApp(a);
        setGuilds(gs);
        if (gs.length > 0) setSelectedGuild(gs[0].id);
      })
      .catch(e => { if (!cancelled) setErr(e.message || t('modals_bot_invite.fail_load')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, clientID]);

  const handleAuthorize = async () => {
    if (!selectedGuild || authorizing) return;
    setAuthorizing(true);
    setErr('');
    try {
      const res = await oauth2Authorize(clientID, selectedGuild, Number(permissionsBits));
      emit('guildMemberAdd', { guild_id: res.guild_id, user_id: res.bot_user_id, is_bot: true });
      emit('botCommandsUpdated', { guild_id: res.guild_id, bot_user_id: res.bot_user_id });
      setDone(true);
    } catch (e) {
      setErr(e.message || t('modals_bot_invite.fail_authorize'));
    } finally {
      setAuthorizing(false);
    }
  };

  const displayName = app ? (app.display_tag || app.name) : '';
  const permsToShow = ALL_PERMISSIONS.filter(p => !p.channelLevel && (permissionsBits & p.bit) !== 0n);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" padding={false}>
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-fluid-3 right-fluid-3 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors z-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="px-fluid-6 pt-fluid-6 pb-fluid-4">
          {loading && (
            <div className="py-fluid-6 text-center text-white/40 text-[13px]">{t('modals_bot_invite.loading')}</div>
          )}

          {!loading && err && !app && (
            <div className="py-fluid-6 text-center">
              <p className="text-red-400 text-[13px]">{err}</p>
            </div>
          )}

          {!loading && app && done && (
            <div className="py-fluid-6 text-center">
              <BotAvatars app={app} />
              <h3 className="text-fluid-lg font-semibold text-white mb-fluid-1">{t('modals_bot_invite.added_template').replace('{name}', displayName)}</h3>
              <p className="text-[13px] text-white/50 mb-fluid-4">
                {t('modals_bot_invite.added_in_template').replace('{server}', guilds.find(g => g.id === selectedGuild)?.name || t('modals_bot_invite.server_fallback'))}
              </p>
              <button
                onClick={onClose}
                className="w-full py-fluid-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold rounded-lg transition-colors"
              >
                {t('modals_bot_invite.btn_done')}
              </button>
            </div>
          )}

          {!loading && app && !done && (
            <>
              <BotAvatars app={app} />
              <h3 className="text-center text-fluid-lg font-semibold text-white mb-fluid-1">{displayName}</h3>
              <p className="text-center text-[13px] text-white/50 mb-fluid-5">
                {t('modals_bot_invite.wants_access')}
              </p>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-fluid-4 mb-fluid-3">
                <p className="text-[13px] text-white/60 mb-fluid-3">
                  {t('modals_bot_invite.permissions_intro_template').split('{name}').flatMap((part, i, arr) => i < arr.length - 1 ? [part, <span key={i} className="text-white/90 font-medium">{displayName}</span>] : [part])}
                </p>
                {permsToShow.length > 0 ? (
                  <div className="space-y-0.5 mb-fluid-4 max-h-40 overflow-y-auto pr-1">
                    {permsToShow.map(p => (
                      <PermissionRow key={p.key} name={p.label} granted />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-white/40 mb-fluid-4">{t('modals_bot_invite.no_perms_requested')}</p>
                )}

                <div className="border-t border-white/[0.06] pt-fluid-3">
                  <label className="block text-[12px] font-semibold text-white/60 uppercase tracking-wider mb-fluid-2">
                    {t('modals_bot_invite.add_to_server')}
                  </label>
                  {guilds.length === 0 ? (
                    <p className="text-[12px] text-white/40">
                      {t('modals_bot_invite.no_permission')}
                    </p>
                  ) : (
                    <SearchableSelect
                      value={selectedGuild}
                      onChange={(v) => setSelectedGuild(v)}
                      options={guilds.map(g => ({ value: g.id, label: g.name }))}
                      searchable={false}
                    />
                  )}
                  <p className="text-[11px] text-white/35 mt-fluid-2">
                    {t('modals_bot_invite.permission_hint_prefix')}<span className="text-white/60">{t('modals_bot_invite.permission_hint_perm')}</span>{t('modals_bot_invite.permission_hint_suffix')}
                  </p>
                </div>
              </div>

              {err && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-fluid-3 py-fluid-2 mb-fluid-3">
                  <p className="text-[12px] text-red-400">{err}</p>
                </div>
              )}

              <div className="flex gap-fluid-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-fluid-3 bg-white/5 hover:bg-white/10 text-white/80 text-[14px] font-semibold rounded-lg transition-colors"
                >
                  {t('modals_bot_invite.btn_back')}
                </button>
                <button
                  onClick={handleAuthorize}
                  disabled={!selectedGuild || authorizing || guilds.length === 0}
                  className="flex-1 py-fluid-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authorizing ? t('modals_bot_invite.btn_authorizing') : t('modals_bot_invite.btn_authorize')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}