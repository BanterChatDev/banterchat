import React, { useState, useEffect, useCallback } from 'react';
import { apiListSessions, apiRevokeSession } from '../../../api/auth';
import { usePermEvents } from '../../../hooks/usePermEvents';
import { createSessionHandlers } from '../../../broadcasts';
import Spinner from '../../ui/Spinner';
import Tooltip from '../../ui/Tooltip';
import { useT } from '../../../hooks/useT';
import { parseUA } from '../../../utils/ua';

export default function DevicesTab() {
  const t = useT();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiListSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePermEvents(createSessionHandlers(load));

  const revoke = async (id) => {
    setRevoking(id); setError('');
    try {
      await apiRevokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) { setError(err.message); }
    finally { setRevoking(null); }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5">
      <h3 className="text-[14px] font-semibold text-white/90 mb-1">{t('settings_security.devices.title')}</h3>
      <p className="text-[12px] text-white/30 mb-3">{t('settings_security.devices.description')}</p>
      {error && <p className="text-[12px] text-red-400 mb-2">{error}</p>}
      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {sessions.map(sess => (
            <div key={sess.id} className={`flex items-center gap-3 p-3 border transition-colors ${sess.current ? 'border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.05)]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-medium text-white/80">{parseUA(sess.user_agent)}</span>
                  {sess.current && <span className="text-[10px] font-bold text-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.15)] px-1.5 py-0.5 uppercase tracking-wider">{t('settings_security.devices.current')}</span>}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/25">
                  <Tooltip text={sess.id}><span aria-label={sess.id}>{t('settings_security.devices.session_prefix')}{sess.id.slice(0, 8)}...</span></Tooltip>
                  <Tooltip text={t('settings_security.devices.ip_hash')}><span aria-label={t('settings_security.devices.ip_hash')}>{sess.ip}</span></Tooltip>
                  <span>{t('settings_security.devices.started_prefix')}{new Date(sess.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {!sess.current && (
                <button onClick={() => revoke(sess.id)} disabled={revoking === sess.id} className="text-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.08] px-3 py-1.5 transition-colors disabled:opacity-40 shrink-0">
                  {revoking === sess.id ? <Spinner size="xs" /> : t('settings_security.devices.revoke')}
                </button>
              )}
            </div>
          ))}
          {sessions.length === 0 && <p className="text-[13px] text-white/20 py-4">{t('settings_security.devices.empty')}</p>}
        </div>
      )}
    </div>
  );
}