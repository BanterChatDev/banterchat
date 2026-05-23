import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SettingsIcon, LogoutIcon, HomeIcon, ShieldIcon, CheckIcon, ChevronIcon, CopyIcon } from '../icons';
import UserCard from './UserCard';
import Status from '../status/Status';
import { useCache } from '../../hooks/useCache';
import { apiGetUser, apiSetPresenceStatus } from '../../api/users';
import { rememberReturnPath } from '../../router';
import { useT } from '../../hooks/useT';
import { ROUTES } from '../../routes';

const STATUS_OPTIONS = [
  { id: 'online',    labelKey: 'user.modal.status_online' },
  { id: 'idle',      labelKey: 'user.modal.status_idle' },
  { id: 'dnd',       labelKey: 'user.modal.status_dnd' },
  { id: 'invisible', labelKey: 'user.modal.status_invisible' },
];

const VARIANTS = {
  default: 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]',
  accent:  'text-[var(--accent)] hover:text-white hover:bg-[var(--accent)]/20',
  danger:  'text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08]',
};

const MenuRow = React.forwardRef(function MenuRow({ icon, label, onClick, variant = 'default', trailing, disabled, active }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-[13px] rounded-lg transition-colors flex items-center gap-2.5 disabled:opacity-50 ${active ? 'bg-white/[0.05] text-white/90' : VARIANTS[variant]}`}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
});

export default function UserModal({ user, onLogout, navigate, isOpen, onClose, onOpenSettings, onViewProfile }) {
  const t = useT();
  const ref = useRef(null);
  const submenuRef = useRef(null);
  const statusRowRef = useRef(null);
  const [busyStatus, setBusyStatus] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [submenuPos, setSubmenuPos] = useState(null);

  const { data: profile, loading } = useCache(
    isOpen && user?.id ? `user:${user.id}` : null,
    () => apiGetUser(user.id),
    { ttl: 60000 }
  );

  const closeSubmenu = useCallback(() => {
    setSubmenuOpen(false);
    setSubmenuPos(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      closeSubmenu();
      return;
    }
    const handler = (e) => {
      const inMain = ref.current && ref.current.contains(e.target);
      const inSub = submenuRef.current && submenuRef.current.contains(e.target);
      if (!inMain && !inSub) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, closeSubmenu]);

  useEffect(() => {
    if (!submenuOpen) return undefined;
    const onResize = () => closeSubmenu();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [submenuOpen, closeSubmenu]);

  if (!isOpen) return null;

  const currentStatus = user?.presence_status || 'online';
  const currentLabel = t(STATUS_OPTIONS.find(o => o.id === currentStatus)?.labelKey || 'user.modal.status_online');

  const toggleSubmenu = () => {
    if (submenuOpen) {
      closeSubmenu();
      return;
    }
    if (!statusRowRef.current) return;
    const r = statusRowRef.current.getBoundingClientRect();
    setSubmenuPos({ top: r.top, left: r.right + 8, mobileTop: r.bottom + 4 });
    setSubmenuOpen(true);
  };

  const handleStatusPick = async (statusId) => {
    if (statusId === currentStatus || busyStatus) {
      closeSubmenu();
      return;
    }
    setBusyStatus(true);
    try { await apiSetPresenceStatus(statusId); } catch {}
    setBusyStatus(false);
    closeSubmenu();
  };

  const copyId = () => {
    if (user?.id) navigator.clipboard.writeText(user.id).catch(() => {});
  };

  const renderStatusOptions = () => STATUS_OPTIONS.map(opt => (
    <MenuRow
      key={opt.id}
      icon={<Status status={opt.id} online size="sm" />}
      label={t(opt.labelKey)}
      onClick={() => handleStatusPick(opt.id)}
      disabled={busyStatus}
      active={currentStatus === opt.id}
      trailing={currentStatus === opt.id ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : null}
    />
  ));

  const actions = (
    <div className="space-y-1">
      <MenuRow
        ref={statusRowRef}
        icon={<Status status={currentStatus} online size="sm" />}
        label={currentLabel}
        onClick={toggleSubmenu}
        trailing={<ChevronIcon className={`w-3 h-3 text-white/30 transition-transform ${submenuOpen ? '-rotate-90 md:rotate-0' : ''}`} />}
        active={submenuOpen}
      />
      {submenuOpen && (
        <div className="md:hidden pl-4 pr-1 py-1 rounded-lg bg-black/15 border-l-2 border-white/[0.08]">
          {renderStatusOptions()}
        </div>
      )}
      <div className="h-px bg-white/[0.06] mx-1 my-1" />
      <MenuRow
        icon={<SettingsIcon className="w-4 h-4" />}
        label={t('user.modal.settings')}
        onClick={() => { onOpenSettings?.(); onClose(); }}
      />
      {user?.is_site_admin && (
        <MenuRow
          icon={<ShieldIcon className="w-4 h-4" />}
          label={t('user.modal.site_admin')}
          variant="accent"
          onClick={() => {
            rememberReturnPath(window.location.pathname + window.location.search);
            navigate(ROUTES.admin);
            onClose();
          }}
        />
      )}
      <MenuRow
        icon={<CheckIcon className="w-4 h-4" />}
        label={t('user.modal.mark_all_read')}
        onClick={() => { window.dispatchEvent(new CustomEvent('markAllRead')); onClose(); }}
      />
      <MenuRow
        icon={<CopyIcon className="w-4 h-4" />}
        label={t('user.modal.copy_user_id')}
        onClick={copyId}
      />
      <MenuRow
        icon={<HomeIcon className="w-4 h-4" />}
        label={t('user.modal.home')}
        onClick={() => { navigate(ROUTES.home); onClose(); }}
      />
      <div className="h-px bg-white/[0.06] mx-1 my-1" />
      <MenuRow
        icon={<LogoutIcon className="w-4 h-4" />}
        label={t('user.modal.sign_out')}
        variant="danger"
        onClick={onLogout}
      />
    </div>
  );

  return (
    <>
      <div ref={ref} className="absolute bottom-full left-0 mb-2 w-[280px] sm:w-[300px] max-w-[calc(100vw-1rem)] bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-xl shadow-2xl animate-slide-up z-50 overflow-hidden">
        <UserCard
          profile={profile}
          loading={loading}
          bannerHeight={80}
          currentUserId={user?.id}
          compact
          onAvatarClick={onViewProfile ? () => { onViewProfile(); onClose(); } : undefined}
        >
          {actions}
        </UserCard>
      </div>

      {submenuOpen && submenuPos && (
        <div
          ref={submenuRef}
          className="hidden md:block fixed z-[60] w-[220px] p-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-xl shadow-2xl animate-slide-up"
          style={{ top: submenuPos.top, left: submenuPos.left }}
        >
          {renderStatusOptions()}
        </div>
      )}
    </>
  );
}