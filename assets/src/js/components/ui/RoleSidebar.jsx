import React from 'react';
import { useT } from '../../hooks/useT';

export function RolePills({ roles, selectedRoleId, onSelect }) {
  return (
    <div className="sm:hidden flex gap-1.5 px-3 py-2.5 border-b border-[var(--border-default)] overflow-x-auto shrink-0 bg-[rgb(var(--bg-secondary-rgb)/0.6)] scrollbar-none">
      {roles.map(role => (
        <button
          key={role.id}
          onClick={() => onSelect(role.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-all duration-200 ${
            selectedRoleId === role.id
              ? 'bg-white/[0.12] text-white shadow-sm'
              : 'bg-white/[0.04] text-white/40 active:bg-white/[0.08]'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
          {role.name}
        </button>
      ))}
    </div>
  );
}

export function RoleSidebarItem({ role, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
        isSelected ? 'bg-white/[0.08] text-white/90' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
      }`}
    >
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
      <span className="text-[13px] font-medium truncate">{role.name}</span>
    </button>
  );
}

export function RoleHeader({ role, label }) {
  return (
    <div className="hidden sm:flex px-5 py-3 border-b border-[var(--border-default)] items-center gap-3 shrink-0">
      <div className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white/[0.06]" style={{ backgroundColor: role.color }} />
      <span className="text-sm font-semibold text-white/90">{role.name}</span>
      {label && <span className="text-[10px] text-white/20 uppercase tracking-wider ml-auto">{label}</span>}
    </div>
  );
}

export default function RoleSidebar({ header, children }) {
  const t = useT();
  return (
    <div className="hidden sm:flex flex-col w-52 bg-[rgb(var(--bg-secondary-rgb)/0.4)] border-r border-[var(--border-default)] shrink-0">
      <div className="px-3 py-2.5 border-b border-[var(--border-default)]">
        {header || <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{t('ui.role_sidebar_default_header')}</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {children}
      </div>
    </div>
  );
}