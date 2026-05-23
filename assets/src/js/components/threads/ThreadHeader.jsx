import React, { useState } from 'react';
import { HashIcon, ChevronIcon } from '../icons';
import { apiArchiveThread, apiUnarchiveThread, apiDeleteThread } from '../../api/threads';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

export default function ThreadHeader({ thread, onJumpToParent, canManage }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const archive = async () => {
    setBusy(true);
    try { await apiArchiveThread(thread.id); } catch {} finally { setBusy(false); }
  };
  const unarchive = async () => {
    setBusy(true);
    try { await apiUnarchiveThread(thread.id); } catch {} finally { setBusy(false); }
  };
  const del = async () => {
    setBusy(true);
    try {
      await apiDeleteThread(thread.id);
      if (onJumpToParent) onJumpToParent();
    } catch {} finally { setBusy(false); }
  };

  return (
    <div className="px-4 py-2 border-b border-white/[0.04] bg-[var(--bg-base)] flex items-center gap-2 flex-shrink-0">
      <Tooltip text={t('threads.header.back_title')}>
        <button
          onClick={onJumpToParent}
          aria-label={t('threads.header.back_title')}
          className="text-[11px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
        >
          <ChevronIcon className="w-3 h-3 rotate-180" />
          {t('threads.header.back')}
        </button>
      </Tooltip>
      <span className="w-px h-3 bg-white/[0.08]" />c
      <HashIcon className="w-3.5 h-3.5 text-white/40" />
      <span className="text-[13px] font-semibold text-white/85 truncate">{thread.name}</span>
      {thread.archived && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60 bg-amber-500/[0.08] px-1.5 py-0.5 rounded">{t('threads.header.archived_badge')}</span>
      )}
      <div className="ml-auto flex items-center gap-1">
        {thread.archived ? (
          canManage && (
            <button onClick={unarchive} disabled={busy} className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 disabled:opacity-40">{t('threads.header.unarchive')}</button>
          )
        ) : (
          canManage && (
            <button onClick={archive} disabled={busy} className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 disabled:opacity-40">{t('threads.header.archive')}</button>
          )
        )}
        {canManage && (
          <button onClick={del} disabled={busy} className="text-[11px] text-red-400/60 hover:text-red-400 px-2 py-1 disabled:opacity-40">{t('threads.header.delete')}</button>
        )}
      </div>
    </div>
  );
}