import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiListGuildBans, apiUnbanGuildMember } from '../../api/guilds';
import { usePermEvents } from '../../hooks/usePermEvents';
import UserAvatar from '../user/UserAvatar';
import { CloseIcon, SearchIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { t as tBare } from '../../lang/apply';
import Spinner from '../ui/Spinner';

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return tBare('common.time_seconds_ago_template').replace('{n}', s);
  if (s < 3600) return tBare('common.time_minutes_ago_template').replace('{n}', Math.floor(s / 60));
  if (s < 86400) return tBare('common.time_hours_ago_template').replace('{n}', Math.floor(s / 3600));
  if (s < 2592000) return tBare('common.time_days_ago_template').replace('{n}', Math.floor(s / 86400));
  return new Date(iso).toLocaleDateString();
}

export default function GuildBansTab({ guildId, canBan }) {
  const t = useT();
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await apiListGuildBans(guildId);
      setBans(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e?.message || tBare('common.error'));
      setBans([]);
    }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { reload(); }, [reload]);

  usePermEvents({
    guildBanAdd: ({ guild_id }) => { if (guild_id === guildId) reload(); },
    guildBanRemove: ({ guild_id, user_id }) => {
      if (guild_id !== guildId) return;
      setBans(prev => prev.filter(b => b.user_id !== user_id));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bans;
    return bans.filter(b => {
      const hay = (b.username || '') + ' ' + (b.user_id || '') + ' ' + (b.reason || '');
      return hay.toLowerCase().includes(q);
    });
  }, [bans, search]);

  const unban = async (userId) => {
    setBusyId(userId);
    try { await apiUnbanGuildMember(guildId, userId); } catch (e) { setError(e?.message || tBare('common.error')); }
    setBusyId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Spinner /></div>;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 shrink-0">
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('settings_bans.search_placeholder')}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg pl-9 pr-8 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {error && (
          <div className="bg-[rgb(var(--accent-danger-rgb)/0.1)] border border-[rgb(var(--accent-danger-rgb)/0.2)] rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-[var(--accent-danger)]">{error}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-4 sm:px-6 pb-4 sm:pb-6">
        {filtered.length === 0 ? (
          <p className="text-[12px] text-white/20 text-center py-12">{search ? t('settings_bans.empty_search') : t('settings_bans.empty')}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => (
              <div key={b.user_id} className="flex items-start gap-3 px-3 py-3 rounded-lg bg-[rgb(var(--accent-danger-rgb)/0.04)] border border-[rgb(var(--accent-danger-rgb)/0.1)]">
                <UserAvatar id={b.user_id} username={b.username} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-white/85 truncate">{b.username || b.user_id}</span>
                    <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[rgb(var(--accent-danger-rgb)/0.2)] text-[var(--accent-danger)] uppercase tracking-wider">{t('settings_bans.badge')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[11px] text-white/40">
                    {b.reason
                      ? <p className="text-white/60"><span className="text-white/30">{t('settings_bans.reason_label')}</span> {b.reason}</p>
                      : <p className="italic text-white/25">{t('settings_bans.no_reason')}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{t('settings_bans.banned_at_template').replace('{when}', timeAgo(b.created_at))}</span>
                    </div>
                  </div>
                </div>
                {canBan && (
                  <button
                    onClick={() => unban(b.user_id)}
                    disabled={busyId === b.user_id}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {busyId === b.user_id ? t('settings_members.action_loading') : t('settings_members.action_unban')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}