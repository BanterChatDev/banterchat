import React, { useState, useRef } from 'react';
import { ChevronIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';
import DropdownMenu, { DropdownItem, DropdownSeparator } from '../ui/DropdownMenu';
import { useGuildMenuItems } from '../../hooks/useGuildMenuItems';

export default function GuildDropdown({ guild, user }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const items = useGuildMenuItems(guild, user);

  const close = () => setOpen(false);
  const handleClick = (e) => {
    if (e?.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation();
    if (!guild) return;
    setOpen(o => !o);
  };

  return (
    <>
      <Tooltip text={guild?.name || t('guilds.dropdown_fallback_title')} placement="bottom">
        <button
          ref={btnRef}
          onClick={handleClick}
          disabled={!guild}
          aria-label={guild?.name || t('guilds.dropdown_fallback_title')}
          className={`flex-1 min-w-0 self-stretch flex items-center gap-2 px-3 text-left transition-colors disabled:opacity-40 disabled:hover:bg-transparent ${open ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}
        >
          <span className="truncate text-[14px] font-semibold text-white/90 flex-1">{guild?.name || t('guilds.dropdown_fallback_name')}</span>
          <ChevronIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-150 ${open ? 'rotate-180 text-white/80' : 'text-white/40'}`} />
        </button>
      </Tooltip>
      {open && guild && (
        <DropdownMenu anchorRef={btnRef} onClose={close} width={240} align="left" className="py-1">
          {items.map((item) => (
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