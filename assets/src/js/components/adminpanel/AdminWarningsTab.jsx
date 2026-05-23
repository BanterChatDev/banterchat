import React, { useState, useCallback } from 'react';
import { apiAdminListUsers, apiAdminListUserWarnings, apiAdminRevokeWarning } from '../../api/admin';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import InfiniteList from '../ui/InfiniteList';
import UserAvatar from '../user/UserAvatar';
import IssueWarningModal from './IssueWarningModal';
import Modal, { ModalHeader } from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { ShieldIcon, CloseIcon, TrashIcon } from '../icons';
import Tooltip from '../ui/Tooltip';

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return new Date(iso).toLocaleDateString();
}

function UserWarningsModal({ user, onClose, onChanged }) {
  const [warnings, setWarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [issueOpen, setIssueOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    apiAdminListUserWarnings(user.id)
      .then(r => setWarnings(r.warnings || []))
      .catch(() => setWarnings([]))
      .finally(() => setLoading(false));
  }, [user]);

  React.useEffect(() => { load(); }, [load]);

  const revoke = async (w) => {
    setRevokingId(w.id);
    try {
      await apiAdminRevokeWarning(w.id);
      setWarnings(list => list.filter(x => x.id !== w.id));
      onChanged?.();
    } catch {} finally { setRevokingId(null); }
  };

  if (!user) return null;

  return (
    <>
      <Modal isOpen={!!user} onClose={onClose} size="lg">
        <ModalHeader
          icon={<ShieldIcon className="w-5 h-5" />}
          title={`Warnings for @${user.username}`}
          subtitle={`User ID ${user.id}`}
        />

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : warnings.length === 0 ? (
          <p className="text-center text-[13px] text-white/40 py-8">No warnings on this user.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {warnings.map(w => (
              <div key={w.id} className="rounded-lg bg-[var(--bg-tertiary)] border border-white/[0.06] p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/15 text-red-400/90">
                      Severity {w.severity}
                    </span>
                    {w.acknowledged && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400/90">Acknowledged</span>}
                    <span className="text-[11px] text-white/40">{timeAgo(w.created_at)}</span>
                  </div>
                  <Tooltip text="Revoke warning">
                    <button
                      onClick={() => revoke(w)}
                      disabled={revokingId === w.id}
                      aria-label="Revoke warning"
                      className="text-white/30 hover:text-red-400 disabled:opacity-40"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
                {w.reasons && w.reasons.length > 0 && (
                  <ul className="text-[12px] text-white/70 list-disc list-inside space-y-0.5 mb-2">
                    {w.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
                {w.note && (
                  <div className="mt-2 p-2 rounded bg-white/[0.02] border-l-2 border-white/10 text-[12px] text-white/60 whitespace-pre-wrap break-words">
                    {w.note}
                  </div>
                )}
                <div className="text-[10px] text-white/25 mt-1.5 font-mono">issued by {w.issued_by}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70">Close</button>
          <button onClick={() => setIssueOpen(true)} className="flex-1 px-4 py-2 rounded-md text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white">+ Issue New</button>
        </div>
      </Modal>

      <IssueWarningModal
        isOpen={issueOpen}
        onClose={() => setIssueOpen(false)}
        userId={user.id}
        username={user.username}
        onIssued={() => { load(); onChanged?.(); }}
      />
    </>
  );
}

export default function AdminWarningsTab() {
  const [openUser, setOpenUser] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchPage = useCallback(({ offset, limit, search }) => {
    return apiAdminListUsers({ offset, limit, search, includeBanned: true }).then(r => ({
      items: r.users || [],
      total: r.total,
    }));
  }, []);

  const {
    items: users, total, hasMore, loading, loadingMore,
    loadInitial, loadMore, search, handleSearch, clearSearch, reset,
  } = usePaginatedSearch({ fetchPage });

  React.useEffect(() => { reset(); loadInitial(); }, [refreshTick]);

  const renderItem = (u) => (
    <div onClick={() => setOpenUser(u)} className="grid grid-cols-[auto_1fr_110px] gap-3 px-4 py-2.5 items-center border-b border-white/[0.04] hover:bg-white/[0.04] cursor-pointer">
      <UserAvatar username={u.username} avatarId={u.avatar_id} userId={u.id} size="sm" />
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-white/85 truncate">{u.username}</div>
        <div className="text-[11px] text-white/30 font-mono truncate">{u.id}</div>
      </div>
      <div className="text-right">
        <button className="text-[11px] font-semibold px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70">
          View / Warn
        </button>
      </div>
    </div>
  );

  const header = (
    <div className="grid grid-cols-[auto_1fr_110px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40 sticky top-0">
      <div className="w-8" />
      <div>User</div>
      <div className="text-right">Action</div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold text-white/90">Warnings</h2>
        <span className="text-[12px] text-white/30 tabular-nums">{total ?? users.length} users</span>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search username to issue or review warnings…"
          className="w-full bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-2 pr-8 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/[0.15]"
        />
        {search && (
          <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <InfiniteList
          items={users}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadInitial={loadInitial}
          onLoadMore={loadMore}
          renderItem={renderItem}
          header={header}
          emptyText="No users found."
        />
      </div>

      <UserWarningsModal
        user={openUser}
        onClose={() => setOpenUser(null)}
        onChanged={() => setRefreshTick(t => t + 1)}
      />
    </div>
  );
}