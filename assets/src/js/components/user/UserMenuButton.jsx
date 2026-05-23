import React, { useRef, useState } from 'react';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';
import DropdownMenu, { DropdownItem, DropdownSeparator } from '../ui/DropdownMenu';
import { useUserMenuItems } from '../../hooks/useUserMenuItems';
import { useAuth } from '../../hooks/useAuth';

export default function UserMenuButton({ targetUser, guildMe, guild, className = '', iconClass = 'w-4 h-4' }) {
  const t = useT();
  const { user: currentUser } = useAuth();
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const items = useUserMenuItems({ targetUser, currentUser, guild, guildMe, includeMessage: true });
  if (!targetUser) return null;
  const close = () => setOpen(false);
  return (
    <>
      <Tooltip text={t('user.menu_button.more_title')}>
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          className={`flex items-center justify-center rounded-md bg-black/30 hover:bg-black/50 text-white/70 hover:text-white transition-colors ${className}`}
          aria-label={t('user.menu_button.more_aria')}
        >
          <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </Tooltip>
      {open && (
        <DropdownMenu anchorRef={btnRef} onClose={close} width={220} align="right" className="py-1">
          {items.map(item => (
            item.separator
              ? <DropdownSeparator key={item.key} />
              : <DropdownItem
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  danger={item.danger}
                  onClick={() => { close(); item.onClick?.(); }}
                />
          ))}
        </DropdownMenu>
      )}
    </>
  );
}