import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiListReports, apiResolveReport } from '../../api/reports';
import { apiTerminateUser } from '../../api/users';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { usePermEvents } from '../../hooks/usePermEvents';
import InfiniteList from '../ui/InfiniteList';
import Modal, { ModalHeader } from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import UserAvatar from '../user/UserAvatar';
import UserProfileModal from '../user/UserProfileModal';
import ReportTargetCard from './ReportTargetCard';
import IssueWarningModal from './IssueWarningModal';
import SuspendUserModal from './SuspendUserModal';
import AdminGuildCard from './AdminGuildCard';
import ContextMenu from '../contextmenu/ContextMenu';
import { FlagIcon, CopyIcon, CheckIcon } from '../icons';
import { useT } from '../../hooks/useT';
import { t as tBare } from '../../lang/apply';

const OVERFLOW_MENU_WIDTH = 220;

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return tBare('common.time_seconds_ago_template').replace('{n}', s);
  if (s < 3600) return tBare('common.time_minutes_ago_template').replace('{n}', Math.floor(s / 60));
  if (s < 86400) return tBare('common.time_hours_ago_template').replace('{n}', Math.floor(s / 3600));
  return tBare('common.time_days_ago_template').replace('{n}', Math.floor(s / 86400));
}

function CopyButton({ value, size = 'sm' }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  const dim = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <Tooltip text={tBare('adminpanel.reports_btn_copy_id')}>
      <button onClick={copy} className="text-white/30 hover:text-white/70 p-0.5 transition-colors">
        {copied ? <CheckIcon className={`${dim} text-emerald-400`} /> : <CopyIcon className={dim} />}
      </button>
    </Tooltip>
  );
}

function StatusPill({ status }) {
  const t = useT();
  if (status === 'resolved') {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400/90">{t('adminpanel.reports_status_resolved')}</span>;
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400/90">{t('adminpanel.reports_status_open')}</span>;
}

function ActionPill({ action }) {
  const t = useT();
  if (!action || action === 'dismiss') return <span className="text-[12px] text-white/60">{t('adminpanel.reports_action_dismiss')}</span>;
  if (action === 'ban_user') return <span className="text-[12px] text-red-400/90">{t('adminpanel.reports_action_ban_user')}</span>;
  if (action === 'delete_message') return <span className="text-[12px] text-red-400/90">{t('adminpanel.reports_action_delete_message')}</span>;
  return <span className="text-[12px] text-white/60">{action}</span>;
}

const FILTERS = ['open', 'resolved', 'all'];

function FilterChip({ value, current, onClick, label }) {
  const active = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={`text-[12px] font-semibold px-3 py-1.5 rounded transition-colors ${active ? 'bg-white/[0.12] text-white/90' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/55'}`}
    >
      {label}
    </button>
  );
}

function ReportRow({ r, onClick, onOpenOverflow }) {
  const t = useT();
  const targetLabel = r.target_type === 'user' && r.target_username
    ? `@${r.target_username}`
    : r.target_type === 'guild' && r.snapshot?.name
      ? r.snapshot.name
      : r.target_type === 'message' && r.snapshot?.username
        ? `@${r.snapshot.username}`
        : t('adminpanel.reports_target_id_template').replace('{short_id}', r.target_id.slice(0, 16));
  return (
    <div
      onClick={onClick}
      className="rounded-lg bg-[var(--bg-secondary)] border border-white/[0.06] p-3 mb-2 cursor-pointer hover:border-white/[0.12] hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-3">
        <UserAvatar
          username={r.target_type === 'message' ? r.snapshot?.username : r.target_username}
          avatarId={r.target_type === 'message' ? r.snapshot?.avatar_id : r.snapshot?.avatar_id}
          userId={r.target_type === 'message' ? r.snapshot?.author_id : r.target_id}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-red-400/90">{r.target_type}</span>
            <StatusPill status={r.status} />
            <span className="text-[13px] font-semibold text-white/85 truncate">{targetLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/40 min-w-0">
            <span className="truncate">{r.reason || <span className="italic text-white/25">{t('adminpanel.reports_modal_no_reason')}</span>}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <UserAvatar username={r.reporter_username} avatarId={r.reporter_avatar_id} userId={r.reporter_id} size="xs" />
            <span className="hidden sm:inline">@{r.reporter_username || r.reporter_id.slice(0, 8)}</span>
          </div>
          <span className="text-[11px] text-white/30 tabular-nums hidden md:inline">{r.created_at && timeAgo(r.created_at)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenOverflow(e, r); }}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/[0.08] text-white/40 hover:text-white/80"
            aria-label={t('adminpanel.reports_btn_more')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ report, onClose, onResolve, onBanReportee, onDeleteMessage, onWarn, onSuspend, onOpenGuild, onUserClick, busy }) {
  const t = useT();
  if (!report) return null;
  const r = report;
  const isUser = r.target_type === 'user';
  const isMessage = r.target_type === 'message';
  const isGuild = r.target_type === 'guild';
  const open = r.status === 'open';

  const targetSectionTitle = isUser
    ? t('adminpanel.reports_modal_section_target_user')
    : isGuild
      ? t('adminpanel.reports_modal_section_target_guild')
      : t('adminpanel.reports_modal_section_target');

  return (
    <Modal isOpen={!!report} onClose={onClose} size="xl">
      <ModalHeader
        icon={<FlagIcon className="w-5 h-5" />}
        title={t('adminpanel.reports_modal_title_template').replace('{short_id}', r.id.slice(0, 12))}
        subtitle={t('adminpanel.reports_modal_subtitle_template')
          .replace('{type}', r.target_type)
          .replace('{time}', r.created_at ? new Date(r.created_at).toLocaleString() : '')}
      />

      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 -mr-2">
        <section>
          <div className="flex items-center justify-between mb-2 gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">{targetSectionTitle}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-white/30 font-mono min-w-0">
              <span className="truncate">{r.target_id}</span>
              <CopyButton value={r.target_id} />
            </div>
          </div>
          <ReportTargetCard
            targetType={r.target_type}
            targetId={r.target_id}
            snapshot={r.snapshot}
            onUserClick={onUserClick}
            onGuildClick={onOpenGuild}
          />
          {isMessage && r.snapshot?.author_id && (
            <p className="mt-2 text-[11px] text-white/35">
              {t('adminpanel.reports_modal_section_message_author')}: <button
                onClick={(e) => onUserClick(r.snapshot.author_id, e)}
                className="text-white/65 hover:text-white/90 hover:underline"
              >@{r.snapshot.username || r.snapshot.author_id.slice(0, 12)}</button>
            </p>
          )}
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/45 mb-2">{t('adminpanel.reports_modal_section_reason')}</p>
          <div className="p-4 rounded-md bg-white/[0.02] border-l-2 border-red-500/30">
            {r.reason
              ? <p className="text-[14px] text-white/85 leading-relaxed whitespace-pre-wrap break-words">{r.reason}</p>
              : <p className="text-[12px] italic text-white/30">{t('adminpanel.reports_modal_no_reason')}</p>}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2 gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">{t('adminpanel.reports_modal_section_reporter')}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-white/30 font-mono min-w-0">
              <span className="truncate">{r.reporter_id}</span>
              <CopyButton value={r.reporter_id} />
            </div>
          </div>
          <div
            onClick={(e) => onUserClick(r.reporter_id, e)}
            className="flex items-center gap-3 p-3 rounded-md bg-[var(--bg-tertiary)] cursor-pointer hover:bg-white/[0.04] transition-colors"
          >
            <UserAvatar username={r.reporter_username} avatarId={r.reporter_avatar_id} userId={r.reporter_id} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-white/90 truncate hover:underline">@{r.reporter_username || '?'}</p>
              <p className="text-[11px] text-white/40 truncate font-mono">{r.reporter_id}</p>
            </div>
          </div>
        </section>

        {!open && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45 mb-2">{t('adminpanel.reports_modal_section_resolution')}</p>
            <div className="p-3 rounded-md bg-emerald-500/[0.04] border border-emerald-500/[0.12] space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t('adminpanel.reports_modal_action_label')}</span>
                <ActionPill action={r.resolution_action} />
              </div>
              {r.resolved_by && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t('adminpanel.reports_modal_section_resolution')}</span>
                  <button
                    onClick={(e) => onUserClick(r.resolved_by, e)}
                    className="text-[12px] text-white/75 hover:text-white/95 hover:underline"
                  >@{r.resolved_by_username || r.resolved_by.slice(0, 12)}</button>
                </div>
              )}
              {r.resolved_at && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t('adminpanel.reports_label_when')}</span>
                  <span className="text-[12px] text-white/75 tabular-nums">{new Date(r.resolved_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {open ? (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/[0.06]">
          <button
            disabled={busy}
            onClick={() => onResolve(r)}
            className="text-[13px] font-semibold px-4 py-2 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/80 disabled:opacity-40"
          >
            {t('adminpanel.reports_btn_dismiss')}
          </button>
          {isUser && (
            <>
              <button
                disabled={busy}
                onClick={() => onWarn(r)}
                className="text-[13px] font-semibold px-4 py-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 disabled:opacity-40"
              >
                {t('adminpanel.reports_btn_warn_user')}
              </button>
              <button
                disabled={busy}
                onClick={() => onSuspend(r)}
                className="text-[13px] font-semibold px-4 py-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 disabled:opacity-40"
              >
                {t('adminpanel.reports_btn_suspend_user')}
              </button>
              <button
                disabled={busy}
                onClick={() => onBanReportee(r)}
                className="text-[13px] font-semibold px-4 py-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40"
              >
                {t('adminpanel.reports_btn_ban_user')}
              </button>
            </>
          )}
          {isMessage && (
            <button
              disabled={busy}
              onClick={() => onDeleteMessage(r)}
              className="text-[13px] font-semibold px-4 py-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40"
            >
              {t('adminpanel.reports_btn_delete_message')}
            </button>
          )}
          {isGuild && (
            <button
              disabled={busy}
              onClick={() => onOpenGuild(r.target_id)}
              className="text-[13px] font-semibold px-4 py-2 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/80 disabled:opacity-40"
            >
              {t('adminpanel.reports_btn_open_guild')}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-[13px] font-semibold px-4 py-2 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/60">
            {t('adminpanel.reports_modal_close')}
          </button>
        </div>
      ) : (
        <div className="flex justify-end mt-5 pt-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="text-[13px] font-semibold px-5 py-2 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/80">
            {t('adminpanel.reports_modal_close')}
          </button>
        </div>
      )}
    </Modal>
  );
}

export default function AdminReportsTab({ currentUserId }) {
  const t = useT();
  const [status, setStatus] = useState('open');
  const [busyId, setBusyId] = useState(null);
  const [openReport, setOpenReport] = useState(null);
  const [warnTarget, setWarnTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [openGuildId, setOpenGuildId] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [overflow, setOverflow] = useState(null);

  const fetchPage = useCallback(({ offset, limit }) => {
    return apiListReports({ status, offset, limit }).then(r => ({
      items: r.reports || [],
      total: r.total,
    }));
  }, [status]);

  const {
    items: reports, setItems: setReports, total, hasMore, loading, loadingMore,
    loadInitial, loadMore, reset,
  } = usePaginatedSearch({ fetchPage });

  useEffect(() => { reset(); loadInitial(); /* eslint-disable-next-line */ }, [status]);

  usePermEvents({
    report: (payload) => {
      if (status === 'open' || status === 'all') {
        setReports(list => [payload, ...list.filter(r => r.id !== payload.id)]);
      }
    },
    reportResolved: ({ id, resolved_by, resolved_by_username, resolution_action }) => {
      if (status === 'open') {
        setReports(list => list.filter(r => r.id !== id));
      } else {
        setReports(list => list.map(r => r.id === id
          ? { ...r, status: 'resolved', resolved_by, resolved_by_username, resolution_action, resolved_at: new Date().toISOString() }
          : r));
      }
      setOpenReport(prev => prev && prev.id === id
        ? { ...prev, status: 'resolved', resolved_by, resolved_by_username, resolution_action, resolved_at: new Date().toISOString() }
        : prev);
    },
  });

  const openProfile = useCallback((userId, e) => {
    if (!userId) return;
    const rect = e?.currentTarget?.getBoundingClientRect?.();
    setProfileAnchor(rect ? { x: rect.left + 20, y: rect.top } : null);
    setProfileUserId(userId);
  }, []);

  const finalize = (id) => {
    setBusyId(null);
    setOpenReport(prev => prev && prev.id === id ? null : prev);
  };

  const dismiss = async (r) => {
    setBusyId(r.id);
    try { await apiResolveReport(r.id, 'dismiss'); } catch {}
    finalize(r.id);
  };

  const banReportee = async (r) => {
    if (r.target_type !== 'user') return;
    setBusyId(r.id);
    try {
      await apiTerminateUser(r.target_id, t('adminpanel.reports_ban_reason_prefix') + (r.reason || t('adminpanel.reports_no_reason_parens')));
      await apiResolveReport(r.id, 'ban_user');
    } catch {}
    finalize(r.id);
  };

  const deleteReportedMessage = async (r) => {
    if (r.target_type !== 'message') return;
    setBusyId(r.id);
    try { await apiResolveReport(r.id, 'delete_message'); } catch {}
    finalize(r.id);
  };

  const openOverflow = (e, r) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOverflow({
      x: rect.right - OVERFLOW_MENU_WIDTH,
      y: rect.bottom + 4,
      report: r,
    });
  };

  const overflowItems = (r) => {
    const items = [];
    items.push({ label: t('adminpanel.reports_btn_view_details'), action: () => setOpenReport(r) });
    if (r.target_type === 'user') {
      items.push({ label: t('adminpanel.reports_modal_section_target_user'), action: (e) => openProfile(r.target_id, e) });
    } else if (r.target_type === 'message' && r.snapshot?.author_id) {
      items.push({ label: t('adminpanel.reports_modal_section_message_author'), action: (e) => openProfile(r.snapshot.author_id, e) });
    } else if (r.target_type === 'guild') {
      items.push({ label: t('adminpanel.reports_btn_open_guild'), action: () => setOpenGuildId(r.target_id) });
    }
    items.push({ label: `${t('adminpanel.reports_modal_section_reporter')}: @${r.reporter_username || '?'}`, action: (e) => openProfile(r.reporter_id, e) });
    items.push({ label: t('adminpanel.reports_btn_copy_id'), action: () => navigator.clipboard.writeText(r.id).catch(() => {}) });
    if (r.status === 'open') {
      items.push({ label: t('adminpanel.reports_btn_dismiss'), action: () => dismiss(r) });
      if (r.target_type === 'user') {
        items.push({ label: t('adminpanel.reports_btn_warn_user'), action: () => setWarnTarget({ id: r.target_id, username: r.target_username || '?', reportId: r.id }) });
        items.push({ label: t('adminpanel.reports_btn_suspend_user'), action: () => setSuspendTarget({ id: r.target_id, username: r.target_username || '?', reportId: r.id }) });
        items.push({ label: t('adminpanel.reports_btn_ban_user'), danger: true, action: () => banReportee(r) });
      }
      if (r.target_type === 'message') {
        items.push({ label: t('adminpanel.reports_btn_delete_message'), danger: true, action: () => deleteReportedMessage(r) });
      }
    }
    return items;
  };

  const renderItem = (r) => (
    <ReportRow r={r} onClick={() => setOpenReport(r)} onOpenOverflow={openOverflow} />
  );

  const filterLabel = (v) => v === 'open'
    ? t('adminpanel.reports_filter_open')
    : v === 'resolved'
      ? t('adminpanel.reports_filter_resolved')
      : t('adminpanel.reports_filter_all');

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-[20px] font-semibold text-white/90">{t('adminpanel.reports_heading')}</h2>
        <span className="text-[12px] text-white/30 tabular-nums">{t('adminpanel.reports_total_template').replace('{n}', total ?? reports.length)}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map(f => (
          <FilterChip key={f} value={f} current={status} onClick={setStatus} label={filterLabel(f)} />
        ))}
      </div>

      {!loading && reports.length === 0 ? (
        <div className="rounded-lg bg-[var(--bg-secondary)] border border-white/[0.06] p-8 text-center">
          <FlagIcon className="w-8 h-8 mx-auto text-white/20 mb-2" />
          <p className="text-[13px] text-white/40">{t('adminpanel.reports_empty')}</p>
        </div>
      ) : (
        <InfiniteList
          items={reports}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadInitial={loadInitial}
          onLoadMore={loadMore}
          renderItem={renderItem}
          emptyText={t('adminpanel.reports_empty')}
        />
      )}

      <DetailModal
        report={openReport}
        onClose={() => setOpenReport(null)}
        onResolve={dismiss}
        onBanReportee={banReportee}
        onDeleteMessage={deleteReportedMessage}
        onWarn={(r) => setWarnTarget({ id: r.target_id, username: r.target_username || '?', reportId: r.id })}
        onSuspend={(r) => setSuspendTarget({ id: r.target_id, username: r.target_username || '?', reportId: r.id })}
        onOpenGuild={(guildId) => setOpenGuildId(guildId)}
        onUserClick={openProfile}
        busy={busyId === openReport?.id}
      />

      <IssueWarningModal
        isOpen={!!warnTarget}
        onClose={() => setWarnTarget(null)}
        userId={warnTarget?.id}
        username={warnTarget?.username}
        onIssued={async () => {
          if (warnTarget?.reportId) {
            try { await apiResolveReport(warnTarget.reportId, 'dismiss'); } catch {}
          }
          setWarnTarget(null);
          setOpenReport(null);
        }}
      />

      <SuspendUserModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        user={suspendTarget ? { id: suspendTarget.id, username: suspendTarget.username } : null}
        onSuspended={async () => {
          if (suspendTarget?.reportId) {
            try { await apiResolveReport(suspendTarget.reportId, 'dismiss'); } catch {}
          }
          setSuspendTarget(null);
          setOpenReport(null);
        }}
      />

      <AdminGuildCard
        guildId={openGuildId}
        onClose={() => setOpenGuildId(null)}
        navigate={() => {}}
      />

      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          currentUserId={currentUserId}
          anchorPos={profileAnchor}
          elevated
          onClose={() => { setProfileUserId(null); setProfileAnchor(null); }}
        />
      )}

      {overflow && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setOverflow(null)} onContextMenu={(e) => { e.preventDefault(); setOverflow(null); }} />
          <ContextMenu
            x={overflow.x}
            y={overflow.y}
            items={overflowItems(overflow.report).map(it => ({
              ...it,
              action: (e) => { it.action(e); setOverflow(null); }
            }))}
            width={OVERFLOW_MENU_WIDTH}
            onClose={() => setOverflow(null)}
          />
        </>
      )}
    </div>
  );
}