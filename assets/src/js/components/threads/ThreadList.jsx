import React, { useState } from 'react';
import { HashIcon, ChevronIcon } from '../icons';
import { useThreadsForParent } from '../../hooks/useThreads';
import { useContextMenu } from '../contextmenu';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

export default function ThreadList({ parentChannelId, activeId, onSelect, can }) {
  const t = useT();
  const [showArchived, setShowArchived] = useState(false);
  const active = useThreadsForParent(parentChannelId, false);
  const archived = useThreadsForParent(parentChannelId, true).filter(th => th.archived);
  const { openMenu } = useContextMenu();

  if (active.length === 0 && archived.length === 0) return null;

  return (
    <div className="ml-4 mb-1 border-l border-white/[0.04] pl-1">
      {active.map(th => (
        <ThreadItem key={th.id} thread={th} active={activeId === th.id} onSelect={onSelect} openMenu={openMenu} can={can} />
      ))}
      {archived.length > 0 && (
        <button
          onClick={() => setShowArchived(s => !s)}
          className="w-full text-left px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/25 hover:text-white/50 flex items-center gap-1"
        >
          <ChevronIcon className={`w-2.5 h-2.5 transition-transform ${showArchived ? 'rotate-90' : ''}`} />
          {t('threads.list.archived_count_template').replace('{n}', archived.length)}
        </button>
      )}
      {showArchived && archived.map(th => (
        <ThreadItem key={th.id} thread={th} active={activeId === th.id} onSelect={onSelect} openMenu={openMenu} can={can} dim />
      ))}
    </div>
  );
}

function ThreadItem({ thread, active, onSelect, openMenu, can, dim }) {
  const cls = active
    ? 'bg-white/[0.06] text-white/90'
    : `${dim ? 'text-white/30' : 'text-white/55'} hover:bg-white/[0.03] hover:text-white/75`;
  return (
    <Tooltip text={thread.name}>
      <button
        onClick={() => onSelect(thread.id)}
        onContextMenu={(e) => { e.preventDefault(); openMenu(e, { thread, can }); }}
        aria-label={thread.name}
        className={`w-full text-left flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] truncate ${cls}`}
      >
        <HashIcon className="w-3 h-3 flex-shrink-0 opacity-50" />
        <span className="truncate">{thread.name}</span>
      </button>
    </Tooltip>
  );
}