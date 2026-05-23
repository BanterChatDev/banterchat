import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { apiAddGuildMemberRole, apiRemoveGuildMemberRole } from '../../api/roles';
import { useRoleList } from '../../hooks/useRoleList';
import { ADMIN_ROLE_ID, DEFAULT_ROLE_ID } from '../../config';
import { SearchIcon, CloseIcon } from '../icons';
import Spinner from '../ui/Spinner';
import { useT } from '../../hooks/useT';

const PRESET_IDS = new Set([ADMIN_ROLE_ID, DEFAULT_ROLE_ID]);
const POPUP_W = 280;
const POPUP_MAX_H = 320;
const GAP = 6;

export default function RoleAssignPopup({ userId, userRoles = [], onClose, anchorRef, guildId }) {
  const t = useT();
  const { roles, loading } = useRoleList(guildId);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  const popupRef = useRef(null);

  useLayoutEffect(() => {
    if (!anchorRef?.current) return;
    const compute = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(POPUP_W, vw - 16);
      const h = Math.min(POPUP_MAX_H, vh - 16);
      let left = rect.left;
      if (left + w + 8 > vw) left = vw - w - 8;
      if (left < 8) left = 8;
      let top = rect.bottom + GAP;
      if (top + h + 8 > vh) top = rect.top - h - GAP;
      if (top < 8) top = 8;
      setPos({ left, top, w });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
          (!anchorRef?.current || !anchorRef.current.contains(e.target))) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose, anchorRef]);

  const userRoleIds = new Set(userRoles.map(r => r.id));
  const assignable = roles.filter(r =>
    !PRESET_IDS.has(r.id) &&
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = async (roleId) => {
    if (!guildId) return;
    setBusy(roleId);
    try {
      if (userRoleIds.has(roleId)) {
        await apiRemoveGuildMemberRole(guildId, userId, roleId);
      } else {
        await apiAddGuildMemberRole(guildId, userId, roleId);
      }
    } catch {}
    setBusy(null);
  };

  return (
    <div
      ref={popupRef}
      className="fixed bg-[var(--bg-popover)] border border-white/[0.08] rounded-md shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] overflow-hidden z-[70] animate-popover-in"
      style={{ left: pos.left, top: pos.top, width: pos.w || POPUP_W }}
    >
      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">{t('user.role_assign.heading')}</p>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('user.role_assign.search_placeholder')}
            className="w-full bg-[var(--bg-input)] border border-white/[0.06] rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-white/70 placeholder-white/20 focus:outline-none focus:border-white/15"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
              <CloseIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto scrollbar-thin px-1.5 pb-2 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        ) : assignable.length === 0 ? (
          <p className="text-[11px] text-white/20 text-center py-3">{t('user.role_assign.empty')}</p>
        ) : (
          assignable.map(role => {
            const active = userRoleIds.has(role.id);
            return (
              <button
                key={role.id}
                onClick={() => toggle(role.id)}
                disabled={busy === role.id}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                  active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                } disabled:opacity-40`}
              >
                <div className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/[0.08]" style={{ backgroundColor: role.color }} />
                <span className="text-[12px] font-medium text-white/70 truncate flex-1">{role.name}</span>
                {busy === role.id ? (
                  <Spinner size="xs" />
                ) : (
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    active ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-white/15'
                  }`}>
                    {active && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8.5L6.5 12L13 4" />
                      </svg>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}