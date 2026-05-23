import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiGetGlobalNotifPref, apiSetGlobalNotifPref } from '../../api/notifprefs';
import { apiUploadNotificationSound, notificationSoundURL } from '../../api/sounds';
import NotificationPrefForm from '../notifications/NotificationPrefForm';
import { useUIPrefs } from '../../hooks/useUIPrefs';

function CustomSoundRow() {
  const { prefs, setPref } = useUIPrefs();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  const activeId = prefs?.notification_sound_id || '';
  const isCustom = !!activeId;

  const handlePick = () => fileInputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setErr('File too large. Max 1 MB.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const res = await apiUploadNotificationSound(file);
      const newId = res?.id || '';
      if (newId) {
        await setPref('notification_sound_id', newId);
      }
    } catch (e2) {
      setErr(e2?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setErr('');
    setBusy(true);
    try {
      await setPref('notification_sound_id', '');
    } catch (e2) {
      setErr(e2?.message || 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = () => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current = null;
    }
    const audio = new Audio(notificationSoundURL(activeId));
    audio.volume = 0.5;
    previewRef.current = audio;
    audio.play().catch(() => {});
  };

  return (
    <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
      <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">Notification sound</div>
      <p className="text-xs text-white/40 mb-3">
        {isCustom
          ? 'Using your custom sound. Click reset to switch back to the default.'
          : 'Using the default. Upload an MP3, WAV, OGG, or WebM (1 MB max).'}
      </p>
      <input
        type="file"
        accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,.mp3,.wav,.ogg,.weba,.webm"
        ref={fileInputRef}
        onChange={handleFile}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handlePreview}
          disabled={busy}
          className="px-3 py-1.5 text-[12px] rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/70 disabled:opacity-40"
        >
          ▶ Preview
        </button>
        <button
          onClick={handlePick}
          disabled={busy}
          className="px-3 py-1.5 text-[12px] rounded bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--accent)] disabled:opacity-40"
        >
          {busy ? 'Working…' : isCustom ? 'Replace' : 'Upload'}
        </button>
        {isCustom && (
          <button
            onClick={handleReset}
            disabled={busy}
            className="px-3 py-1.5 text-[12px] rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/50 disabled:opacity-40"
          >
            Reset to default
          </button>
        )}
      </div>
      {err && <p className="text-[11px] text-red-400 mt-2">{err}</p>}
    </div>
  );
}

export default function NotificationsTab() {
  const [pref, setPref] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGetGlobalNotifPref()
      .then(p => setPref(p))
      .catch(() => setPref(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async (draft) => {
    setSaving(true);
    try {
      const res = await apiSetGlobalNotifPref({
        level: draft.level,
        suppress_everyone: draft.suppress_everyone,
        suppress_roles: draft.suppress_roles,
      });
      setPref(res);
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <>
      <CustomSoundRow />
      <NotificationPrefForm
        scopeLabel="Default for all servers"
        scopeDescription="These settings apply to every server unless you override them per-server. Direct messages always use this scope."
        loading={loading}
        pref={pref}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}