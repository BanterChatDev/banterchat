import React, { useEffect, useState } from 'react';
import { apiGetGuild } from '../../api/guilds';
import Modal from '../ui/Modal';
import GuildCard from './GuildCard';
import Spinner from '../ui/Spinner';
import { useT } from '../../hooks/useT';

export default function GuildPreviewModal({ guildId, onClose }) {
  const t = useT();
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guildId) { setGuild(null); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGetGuild(guildId)
      .then(g => { if (!cancelled) setGuild(g); })
      .catch(err => { if (!cancelled) setError(err?.message || t('guilds.preview_fail_load')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [guildId, t]);

  return (
    <Modal isOpen={!!guildId} onClose={onClose} size="sm">
      {loading && (
        <div className="flex justify-center py-6"><Spinner /></div>
      )}
      {!loading && error && (
        <p className="text-[13px] text-red-400 text-center py-4">{error}</p>
      )}
      {!loading && !error && guild && (
        <GuildCard guild={guild} size="lg" />
      )}
    </Modal>
  );
}