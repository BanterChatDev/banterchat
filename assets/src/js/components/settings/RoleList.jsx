import React from 'react';
import { TrashIcon } from '../icons';
import { ADMIN_ROLE_ID, DEFAULT_ROLE_ID } from '../../config';
import { apiUpdateRole } from '../../api/roles';
import { useDragReorder } from '../../hooks/useDragReorder';
import { useT } from '../../hooks/useT';

const isPreset = (role) => role.id === ADMIN_ROLE_ID || role.id === DEFAULT_ROLE_ID;

export default function RoleList({ roles = [], selectedRole, onSelect, onDelete, onRolesReorder, userTopPosition = 999, isOwner = false }) {
  const t = useT();
  if (!Array.isArray(roles)) roles = [];
  const admin = roles.find(r => r.id === ADMIN_ROLE_ID);
  const defaultRole = roles.find(r => r.id === DEFAULT_ROLE_ID);
  const custom = roles
    .filter(r => !isPreset(r))
    .sort((a, b) => (a.position || 100) - (b.position || 100));

  const handleReorder = async (updated) => {
    onRolesReorder(updated);
    for (const r of updated) {
      const orig = custom.find(c => c.id === r.id);
      if (!orig || orig.position !== r.position) {
        try { await apiUpdateRole(r.id, { position: r.position }); } catch {}
      }
    }
  };

  const { dragProps, isOver } = useDragReorder(custom, handleReorder);

  const renderRole = (role, opts = {}) => {
    const { draggable, idx } = opts;
    const selected = selectedRole && selectedRole.id === role.id;
    const preset = isPreset(role);
    const over = isOver(idx);
    const locked = !isOwner && !preset && role.position <= userTopPosition;

    return (
      <div
        key={role.id}
        {...(draggable && !locked ? dragProps(idx) : {})}
        onClick={() => !locked && onSelect(role)}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all group ${
          locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${!locked && selected ? 'bg-white/[0.08] border border-white/[0.12]' : 'border border-transparent'} ${!locked && !selected ? 'hover:bg-white/[0.04]' : ''} ${draggable && !locked && over ? 'border-t-2 border-t-white/30' : ''}`}
      >
        {draggable && (
          <div className="shrink-0 cursor-grab active:cursor-grabbing text-white/15 hover:text-white/30">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
            </svg>
          </div>
        )}
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-white/80 truncate">{role.name}</span>
            {preset && (
              <span className="text-[8px] font-bold text-white/20 bg-white/[0.06] rounded px-1 py-px uppercase tracking-wider shrink-0">{t('settings_roles.system_badge')}</span>
            )}
          </div>
        </div>
        {!preset && !locked && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(role); }}
            className="p-1 text-red-400/0 group-hover:text-red-400/40 hover:!text-red-400/80 hover:bg-red-500/[0.08] rounded transition-all shrink-0"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {admin && renderRole(admin)}
      {custom.map((role, idx) => renderRole(role, { draggable: true, idx }))}
      {defaultRole && renderRole(defaultRole)}
    </div>
  );
}