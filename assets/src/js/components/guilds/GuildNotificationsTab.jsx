import React, { useEffect, useState, useCallback } from 'react';
import { apiGetGuildNotifPref, apiSetGuildNotifPref, apiResetNotifPref } from '../../api/notifprefs';
import NotificationPrefForm from '../notifications/NotificationPrefForm';

export default function GuildNotificationsTab({ guildId, guildName }) {
  const [pref, setPref] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!guildId) return;
    setLoading(true);
    apiGetGuildNotifPref(guildId)
      .then(p => setPref(p))
      .catch(() => setPref(null))
      .finally(() => setLoading(false));
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async (draft) => {
    setSaving(true);
    try {
      const res = await apiSetGuildNotifPref(guildId, {
        level: draft.level,
        suppress_everyone: draft.suppress_everyone,
        suppress_roles: draft.suppress_roles,
      });
      setPref(res);
    } finally {
      setSaving(false);
    }
  }, [guildId]);

  const handleReset = useCallback(async () => {
    if (!confirm('Remove this server-specific override and use your global notification settings?')) return;
    setSaving(true);
    try {
      await apiResetNotifPref('guild', guildId);
      load();
    } finally {
      setSaving(false);
    }
  }, [guildId, load]);

  return (
    <NotificationPrefForm
      scopeLabel={guildName || 'This server'}
      scopeDescription="How notifications behave for this server specifically."
      loading={loading}
      pref={pref}
      onSave={handleSave}
      onReset={handleReset}
      saving={saving}
      showOverrideHint
    />
  );
}