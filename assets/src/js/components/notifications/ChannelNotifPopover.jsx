import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiGetChannelNotifPref, apiSetChannelNotifPref, apiResetNotifPref } from '../../api/notifprefs';
import Spinner from '../ui/Spinner';
import { CloseIcon } from '../icons';

const LEVELS = [
  { value: 'all',      label: 'All Messages' },
  { value: 'mentions', label: 'Only @mentions' },
  { value: 'nothing',  label: 'Nothing' },
];

export default function ChannelNotifPopover({ channelId, channelName, onClose, anchorRef }) {
  const [pref, setPref] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    apiGetChannelNotifPref(channelId)
      .then(setPref)
      .catch(() => setPref(null))
      .finally(() => setLoading(false));
  }, [channelId]);

  useEffect(() => {
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) &&
          (!anchorRef?.current || !anchorRef.current.contains(e.target))) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose, anchorRef]);

  const save = useCallback(async (patch) => {
    if (!pref) return;
    setSaving(true);
    try {
      const next = { ...pref, ...patch };
      const res = await apiSetChannelNotifPref(channelId, {
        level: next.level,
        suppress_everyone: next.suppress_everyone,
        suppress_roles: next.suppress_roles,
      });
      setPref(res);
    } catch {} finally {
      setSaving(false);
    }
  }, [pref, channelId]);

  const reset = async () => {
    setSaving(true);
    try {
      await apiResetNotifPref('channel', channelId);
      const fresh = await apiGetChannelNotifPref(channelId);
      setPref(fresh);
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={popRef}
      className="absolute right-0 top-full mt-2 w-[300px] max-w-[calc(100vw-2rem)] bg-[var(--bg-popover)] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden animate-popover-in"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-white/[0.04]">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">Notifications</div>
          <div className="text-[12px] font-semibold text-white/80 truncate">#{channelName}</div>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 flex-shrink-0">
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading || !pref ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="p-3 space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1.5">Level</div>
            <div className="grid grid-cols-1 gap-1">
              {LEVELS.map(l => {
                const active = pref.level === l.value;
                return (
                  <button
                    key={l.value}
                    onClick={() => save({ level: l.value })}
                    disabled={saving}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[12px] transition-colors disabled:opacity-50 ${
                      active ? 'bg-[var(--accent)]/15 text-white/85' : 'text-white/65 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${active ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-white/25'}`} />
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-2 flex items-center justify-between">
            <span className="text-[10px] text-white/30">Overrides server settings</span>
            <button
              onClick={reset}
              disabled={saving}
              className="text-[10px] font-semibold text-white/40 hover:text-white/70 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}