import React, { useState } from 'react';
import ContextMenu from '../contextmenu/ContextMenu';
import { apiAdminUnsuspendUser, apiAdminForceLogoutUser, apiAdminPromoteUser, apiAdminDemoteUser } from '../../api/admin';
import { apiTerminateUser, apiRestoreUser } from '../../api/users';

const MENU_WIDTH = 220;

export default function AdminUserActionsMenu({ user, currentUserId, onAction, onSuspendClick, onDeleteClick }) {
  const [pos, setPos] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user.id === currentUserId) {
    return <span className="text-[11px] text-white/20">—</span>;
  }

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); onAction?.(); } catch {} finally { setBusy(false); setPos(null); }
  };

  const openMenu = (e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.right - MENU_WIDTH, y: r.bottom + 4 });
  };

  const items = [];
  if (user.banned) {
    items.push({ label: 'Restore', action: () => run(() => apiRestoreUser(user.id)) });
  } else {
    items.push({ label: 'Terminate', danger: true, action: () => run(() => apiTerminateUser(user.id, '')) });
  }
  if (user.suspended) {
    items.push({ label: 'Unsuspend', action: () => run(() => apiAdminUnsuspendUser(user.id)) });
  } else {
    items.push({ label: 'Suspend…', action: () => { setPos(null); onSuspendClick?.(user); } });
  }
  items.push({ label: 'Force log-out', action: () => run(() => apiAdminForceLogoutUser(user.id)) });
  if (user.is_site_admin) {
    items.push({ label: 'Demote from site admin', action: () => run(() => apiAdminDemoteUser(user.id)) });
  } else {
    items.push({ label: 'Promote to site admin', action: () => run(() => apiAdminPromoteUser(user.id, '')) });
  }
  items.push({ label: 'Delete permanently…', danger: true, action: () => { setPos(null); onDeleteClick?.(user); } });

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={openMenu}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/[0.08] text-white/50 hover:text-white/80 disabled:opacity-40"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setPos(null)} onContextMenu={(e) => { e.preventDefault(); setPos(null); }} />
          <ContextMenu x={pos.x} y={pos.y} items={items} width={MENU_WIDTH} onClose={() => setPos(null)} />
        </>
      )}
    </>
  );
}