import React, { useState } from 'react';
import DropdownMenu, { DropdownLabel, DropdownSeparator } from '../ui/DropdownMenu';
import { CheckIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Spinner from '../ui/Spinner';

export default function MediaPickerPopover({
  langPrefix,
  useDevices,
  currentDeviceId,
  onSelect,
  onClose,
  anchorRef,
}) {
  const t = useT();
  const { devices, hasPermission, isDenied, isUnsupported, requestPermission } = useDevices();
  const [requesting, setRequesting] = useState(false);
  const [switching, setSwitching] = useState(false);

  const tk = (suffix) => t(`${langPrefix}.${suffix}`);

  const handleAllow = async (e) => {
    e.stopPropagation();
    setRequesting(true);
    await requestPermission();
    setRequesting(false);
  };

  const handlePick = async (e, id) => {
    e.stopPropagation();
    if (switching) return;
    if (typeof onSelect !== 'function') {
      onClose();
      return;
    }
    setSwitching(true);
    await onSelect(id);
    setSwitching(false);
    onClose();
  };

  return (
    <DropdownMenu anchorRef={anchorRef} onClose={onClose} width={240} align="right">
      <DropdownLabel>{tk('title')}</DropdownLabel>

      {isUnsupported ? (
        <div className="px-3 pb-3 text-[12px] text-white/40">
          {tk('unsupported')}
        </div>
      ) : isDenied ? (
        <div className="px-3 pb-3 text-[12px] text-red-300/80 leading-snug">
          {tk('denied')}
        </div>
      ) : devices.length > 0 ? (
        <div className="pb-1 max-h-[40vh] sm:max-h-[280px] overflow-y-auto">
          {[{ deviceId: '', label: tk('system_default') }, ...devices].map((d, idx) => {
            const isDefault = d.deviceId === '';
            const active = isDefault ? !currentDeviceId : d.deviceId === currentDeviceId;
            const fallbackName = isDefault ? null : `${tk('unnamed_device')} ${idx}`;
            return (
              <React.Fragment key={d.deviceId || '__default__'}>
                {idx === 1 && <DropdownSeparator />}
                <button
                  onClick={(e) => handlePick(e, d.deviceId)}
                  disabled={switching}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
                    active
                      ? 'bg-white/[0.06] text-white/95'
                      : 'text-white/70 hover:bg-white/[0.04] hover:text-white/95'
                  } disabled:opacity-50`}
                >
                  <span className="flex-1 truncate">
                    {d.label || fallbackName || tk('unnamed_device')}
                  </span>
                  {active && <CheckIcon className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
          {!hasPermission && (
            <div className="px-3 py-2 mt-1 border-t border-white/[0.05]">
              <button
                onClick={handleAllow}
                disabled={requesting}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:brightness-110 text-white text-[11px] font-semibold rounded-md transition-all disabled:opacity-50"
              >
                {requesting ? <Spinner size="sm" /> : tk('allow_for_names')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[12px] text-white/55 leading-snug">
            {tk('permission_hint')}
          </p>
          <button
            onClick={handleAllow}
            disabled={requesting}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:brightness-110 text-white text-[12px] font-semibold rounded-md transition-all disabled:opacity-50"
          >
            {requesting ? <Spinner size="sm" /> : tk('allow')}
          </button>
        </div>
      )}
    </DropdownMenu>
  );
}