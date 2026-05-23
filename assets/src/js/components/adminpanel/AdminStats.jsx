import React, { useEffect, useState, useCallback } from 'react';
import { apiAdminStats } from '../../api/admin';
import { usePermEvents } from '../../hooks/usePermEvents';
import { useT } from '../../hooks/useT';

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-white/[0.06] p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/40 mb-3">{label}</p>
      <p className="text-[40px] font-bold tabular-nums leading-none" style={{ color: accent || 'rgba(255,255,255,0.92)' }}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export default function AdminStats() {
  const t = useT();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    apiAdminStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiAdminStats()
      .then(d => { if (!cancelled) setStats(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  usePermEvents({
    adminUserPresence: reload,
    userTerminate: reload,
    userRestore: reload,
  });

  return (
    <div className="max-w-3xl">
      <h2 className="text-[20px] font-semibold text-white/90 mb-1">{t('adminpanel.stats_heading')}</h2>
      <p className="text-[13px] text-white/40 mb-6">{t('adminpanel.stats_subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard label={t('adminpanel.stats_online_now')} value={stats?.users_online} accent="rgb(59,165,92)" />
        <StatCard label={t('adminpanel.stats_total_users')} value={stats?.users} />
        <StatCard label={t('adminpanel.stats_online_web')} value={stats?.users_online_web} accent="rgb(124,160,255)" />
        <StatCard label={t('adminpanel.stats_online_desktop')} value={stats?.users_online_desktop} accent="rgb(212,140,255)" />
        <StatCard label={t('adminpanel.stats_guilds')} value={stats?.guilds} />
        <StatCard label={t('adminpanel.stats_messages')} value={(stats?.messages || 0).toLocaleString()} />
      </div>

      {loading && <p className="mt-6 text-[12px] text-white/30">{t('ui.infinite_list_loading')}</p>}
    </div>
  );
}