import React, { useState, useCallback } from 'react';
import GuildPreviewModal from '../components/guilds/GuildPreviewModal';

export default function useGuildPreview() {
  const [viewGuildId, setViewGuildId] = useState(null);
  const open = useCallback((id) => { if (id) setViewGuildId(id); }, []);
  const close = useCallback(() => setViewGuildId(null), []);
  const modal = viewGuildId
    ? <GuildPreviewModal guildId={viewGuildId} onClose={close} />
    : null;
  return { open, modal, isOpen: !!viewGuildId };
}