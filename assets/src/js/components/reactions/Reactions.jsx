import React, { useState, useEffect, useCallback } from 'react';
import ReactionPicker from './ReactionPicker';
import { useT } from '../../hooks/useT';
import { t as tBare } from '../../lang/apply';
import { u } from '../../api/routes';
import Tooltip from '../ui/Tooltip';
import { useGuildEmojiCache, getDefaultEmojiById } from '../emoji/useGuildEmojiCache';

const REACTION_EMOJI_PX = 20;

function reactionTooltip(r, currentName) {
  const names = r.users || [];
  const remaining = r.count - names.length;
  const tag = `:${currentName || r.name || ''}:`;
  if (names.length === 0) return tBare('reactions.tooltip_count_template').replace('{count}', r.count).replace('{emoji}', tag);
  if (names.length === 1 && remaining === 0) return tBare('reactions.tooltip_one_template').replace('{name}', names[0]).replace('{emoji}', tag);
  if (remaining <= 0) return tBare('reactions.tooltip_list_template').replace('{names}', names.join(', ')).replace('{emoji}', tag);
  const others = remaining > 1 ? tBare('reactions.others_many') : tBare('reactions.others_one');
  return tBare('reactions.tooltip_list_more_template').replace('{names}', names.join(', ')).replace('{remaining}', remaining).replace('{others}', others).replace('{emoji}', tag);
}

function ReactionChips({ displayed, guildId, onToggle }) {
  const guildCache = useGuildEmojiCache(guildId);
  return displayed.map((r) => {
    const cached = guildCache.byId.get(r.emoji_id) || getDefaultEmojiById(r.emoji_id);
    const currentName = cached?.name || r.name;
    const tipText = reactionTooltip(r, currentName);
    return (
      <Tooltip key={r.emoji_id} text={tipText} maxWidth={320}>
        <button
          onClick={() => onToggle(r.emoji_id, currentName)}
          aria-label={tipText}
          className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-full text-xs transition-all duration-150 border select-none cursor-pointer active:scale-95 ${r.me ? 'bg-[rgb(var(--accent-rgb)/0.15)] border-[rgb(var(--accent-rgb)/0.3)] hover:bg-[rgb(var(--accent-rgb)/0.25)]' : 'bg-[var(--bg-float)] border-[var(--border-default)] hover:bg-[rgb(var(--content-base)/0.08)] hover:border-[var(--border-medium)]'}`}
        >
          <img src={u.emoji(r.emoji_id)} alt={`:${currentName || ''}:`} style={{ width: REACTION_EMOJI_PX, height: REACTION_EMOJI_PX }} className="leading-none" />
          <span className={`text-[12px] font-semibold tabular-nums leading-none ${r.me ? 'text-[var(--accent)]' : 'text-[rgb(var(--content-base)/0.55)]'}`}>{r.count}</span>
        </button>
      </Tooltip>
    );
  });
}

export default function Reactions({ reactions, messageId, channelId, guildId, userId }) {
  const t = useT();
  const [picker, setPicker] = useState(null);
  const [optimistic, setOptimistic] = useState(null);
  const displayed = optimistic ?? reactions ?? [];

  useEffect(() => {
    setOptimistic(null);
  }, [reactions]);

  const toggle = useCallback((emojiID, name) => {
    const current = reactions ?? [];
    const existing = current.find(r => r.emoji_id === emojiID);
    const type = existing?.me ? 'reaction_remove' : 'reaction_add';
    let next;
    if (existing?.me) {
      next = current.map(r => r.emoji_id === emojiID ? { ...r, count: r.count - 1, me: false } : r).filter(r => r.count > 0);
    } else if (existing) {
      next = current.map(r => r.emoji_id === emojiID ? { ...r, count: r.count + 1, me: true } : r);
    } else {
      next = [...current, { emoji_id: emojiID, name: name || existing?.name || '', count: 1, me: true }];
    }
    setOptimistic(next);
    window.__wsSend?.({ type, payload: { message_id: messageId, channel_id: channelId, emoji_id: emojiID } });
    if (type === 'reaction_add') {
      window.dispatchEvent(new CustomEvent('reactionAdded'));
    }
    setPicker(null);
  }, [reactions, messageId, channelId]);

  useEffect(() => {
    const handler = (ev) => {
      const detail = ev?.detail;
      if (!detail || detail.messageId !== messageId) return;
      setPicker({ x: detail.x, y: detail.y });
    };
    window.addEventListener('openReactionPicker', handler);
    return () => window.removeEventListener('openReactionPicker', handler);
  }, [messageId]);

  const hasReactions = displayed.length > 0;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${hasReactions ? 'mt-1' : ''}`}>
      {hasReactions && <ReactionChips displayed={displayed} guildId={guildId} onToggle={toggle} />}
      {picker && <ReactionPicker onSelect={toggle} onClose={() => setPicker(null)} pointerX={picker.x} pointerY={picker.y} guildId={guildId} />}
    </div>
  );
}