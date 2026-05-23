import React, { useState, useEffect } from 'react';
import { apiSecurityLog } from '../../../api/auth';
import Spinner from '../../ui/Spinner';
import Tooltip from '../../ui/Tooltip';
import { useT } from '../../../hooks/useT';
import { parseUA } from '../../../utils/ua';

function actionLabel(action, t) {
  const key = `settings_security.action.${action.replace(/\./g, '_')}`;
  const localized = t(key);
  if (localized && localized !== key) return localized;
  return action;
}

export default function SecurityLogTab() {
  const t = useT();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiSecurityLog();
        setEntries(res.entries || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-3xl p-4 sm:p-5">
      <h3 className="text-[14px] font-semibold text-white/90 mb-1">{t('settings_security.log.title')}</h3>
      <p className="text-[12px] text-white/30 mb-3">{t('settings_security.log.description')}</p>
      {error && <p className="text-[12px] text-red-400 mb-2">{error}</p>}
      {loading ? <Spinner /> : (
        <div className="space-y-1.5">
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 border border-white/[0.04] bg-white/[0.01]">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-white/80">{actionLabel(e.action, t)}</div>
                <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-white/30 mt-0.5">
                  {e.metadata?.user_agent && <span>{parseUA(e.metadata.user_agent)}</span>}
                  {e.metadata?.ip_hash && <span className="font-mono">{e.metadata.ip_hash.slice(0, 8)}…</span>}
                  {e.metadata?.fingerprint && <Tooltip text={e.metadata.fingerprint}><span className="font-mono">{e.metadata.fingerprint.slice(0, 16)}…</span></Tooltip>}
                  {e.metadata?.old_fingerprint && e.metadata?.new_fingerprint && (
                    <Tooltip text={`${e.metadata.old_fingerprint} → ${e.metadata.new_fingerprint}`}>
                      <span className="font-mono">{e.metadata.old_fingerprint.slice(0, 8)}… → {e.metadata.new_fingerprint.slice(0, 8)}…</span>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-white/30 shrink-0">{new Date(e.created_at).toLocaleString()}</div>
            </div>
          ))}
          {entries.length === 0 && <p className="text-[13px] text-white/20 py-4">{t('settings_security.log.empty')}</p>}
        </div>
      )}
    </div>
  );
}