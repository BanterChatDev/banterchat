import React, { useEffect, useState } from 'react';
import { apiGetMyGuildProfile, apiUpdateMyGuildProfile } from '../../api/guilds';
import { useT } from '../../hooks/useT';
import Spinner from '../ui/Spinner';

export default function GuildNicknameTab({ guildId }) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [initial, setInitial] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!guildId) return undefined;
    let cancelled = false;
    setLoading(true);
    apiGetMyGuildProfile(guildId).then(p => {
      if (cancelled) return;
      const n = p?.nickname || '';
      setNickname(n);
      setInitial(n);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [guildId]);

  const dirty = nickname !== initial;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await apiUpdateMyGuildProfile(guildId, { nickname });
      setInitial(nickname);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch {} finally { setSaving(false); }
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Spinner /></div>;
  }

  return (
    <div className="p-5 max-w-[480px] space-y-4">
      <div>
        <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">{t('guilds.nickname_label')}</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('guilds.nickname_placeholder')}
          maxLength={32}
          className="w-full bg-[var(--bg-input)] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[var(--accent)]"
        />
        <p className="text-[11px] text-white/35 mt-1">{t('guilds.nickname_hint')}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-4 py-1.5 text-[12px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-md disabled:opacity-40"
        >
          {saving ? t('guilds.nickname_saving') : t('guilds.nickname_save')}
        </button>
        {savedFlash && <span className="text-[11px] text-white/45">{t('guilds.nickname_saved')}</span>}
      </div>
    </div>
  );
}