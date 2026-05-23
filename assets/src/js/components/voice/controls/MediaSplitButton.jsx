import React, { useRef, useState } from 'react';
import { useT } from '../../../hooks/useT';
import { ChevronIcon } from '../../icons';
import Tooltip from '../../ui/Tooltip';

export default function MediaSplitButton({
  on,
  onToggle,
  onIcon,
  offIcon,
  onLabelKey,
  offLabelKey,
  selectLabelKey,
  activeStyle,
  Popover,
  currentDeviceId,
  onSelectDevice,
  compact = false,
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const chevronRef = useRef(null);

  const toggleLabel = on ? t(onLabelKey) : t(offLabelKey);
  const inactiveStyle = 'bg-white/[0.06] text-white/75 hover:bg-white/[0.10] hover:text-white';
  const toggleState = on ? activeStyle : inactiveStyle;
  const chevronState = open
    ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
    : 'bg-white/[0.06] text-white/55 hover:bg-white/[0.10] hover:text-white/85';

  const heightCls = compact ? 'h-8' : 'h-10';
  const toggleWCls = compact ? 'w-8' : 'w-10';
  const chevronWCls = compact ? 'w-5' : 'w-6';
  const toggleIconCls = compact ? 'w-4 h-4' : 'w-5 h-5';
  const chevronIconCls = compact ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <>
      <div className={`flex items-stretch ${heightCls} rounded-full overflow-hidden`}>
        <Tooltip text={toggleLabel}>
          <button
            type="button"
            onClick={onToggle}
            aria-label={toggleLabel}
            className={`${toggleWCls} flex items-center justify-center transition-colors rounded-l-full ${toggleState}`}
          >
            <span className={`${toggleIconCls} flex items-center justify-center`}>
              {on ? onIcon : offIcon}
            </span>
          </button>
        </Tooltip>
        <span className="w-px bg-black/40" aria-hidden="true" />
        <Tooltip text={t(selectLabelKey)}>
          <button
            type="button"
            ref={chevronRef}
            onClick={() => setOpen(o => !o)}
            aria-label={t(selectLabelKey)}
            aria-expanded={open}
            className={`${chevronWCls} flex items-center justify-center transition-colors rounded-r-full ${chevronState}`}
          >
            <ChevronIcon className={`${chevronIconCls} transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </Tooltip>
      </div>
      {open && Popover && (
        <Popover
          currentDeviceId={currentDeviceId}
          onSelect={onSelectDevice}
          onClose={() => setOpen(false)}
          anchorRef={chevronRef}
        />
      )}
    </>
  );
}