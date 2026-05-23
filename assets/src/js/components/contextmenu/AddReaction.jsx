import React from 'react';
import { registerContextMenuItems } from './ContextMenuProvider';
import { t as tBare } from '../../lang/apply';
import { apiListFrequentEmojis } from '../../api/emojis';
import { u } from '../../api/routes';
import EmojiTooltip from '../ui/EmojiTooltip';
import { registerResetHandler } from '../../cache';

const QUICK_EMOJI_PX = 22;
const QUICK_BUTTON_PX = 38;
const frequentCache = new Map();

registerResetHandler(() => frequentCache.clear());

function loadFrequent(channelId) {
  const key = channelId || '';
  const cached = frequentCache.get(key);
  if (cached && cached.length > 0) return Promise.resolve(cached);
  return apiListFrequentEmojis(channelId).then(list => {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length > 0) frequentCache.set(key, arr);
    return arr;
  }).catch(() => []);
}

function invalidateFrequent() { frequentCache.clear(); }

if (typeof window !== 'undefined') {
  window.addEventListener('reactionAdded', invalidateFrequent);
}

function QuickReactionsRow({ msg, close }) {
  const [items, setItems] = React.useState(() => frequentCache.get(msg.channel_id || '') || null);
  const [loaded, setLoaded] = React.useState(() => frequentCache.has(msg.channel_id || ''));
  React.useEffect(() => {
    if (loaded) return;
    loadFrequent(msg.channel_id).then(list => { setItems(list); setLoaded(true); });
  }, [msg.channel_id, loaded]);
  if (loaded && (!items || items.length === 0)) return null;
  return (
    <div className="px-1.5 pt-1.5 pb-1 mb-0.5 border-b border-[var(--border-subtle)]">
      <div
        className="flex items-center gap-0.5 p-1 rounded-lg bg-[var(--bg-float)] border border-[var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        style={{ minHeight: QUICK_BUTTON_PX + 8 }}
      >
        {(items || []).map((em) => (
          <EmojiTooltip key={em.id} emoji={em}>
            <button
              onClick={() => {
                window.__wsSend?.({ type: 'reaction_add', payload: { message_id: msg.id, channel_id: msg.channel_id, emoji_id: em.id } });
                window.dispatchEvent(new CustomEvent('reactionAdded'));
                close();
              }}
              aria-label={`:${em.name}:`}
              className="rounded-md hover:bg-[rgb(var(--content-base)/0.08)] active:bg-[rgb(var(--accent-rgb)/0.16)] transition-colors duration-75 flex items-center justify-center flex-shrink-0"
              style={{ width: QUICK_BUTTON_PX, height: QUICK_BUTTON_PX }}
            >
              <img src={u.emoji(em.id)} alt={`:${em.name}:`} style={{ width: QUICK_EMOJI_PX, height: QUICK_EMOJI_PX }} />
            </button>
          </EmojiTooltip>
        ))}
      </div>
    </div>
  );
}

registerContextMenuItems('add-reaction',
  (e, ctx) => !!ctx?.message && !ctx.message._commandError && !ctx.message.system_type,
  (e, ctx) => {
    const msg = ctx.message;
    return [
      {
        header: ({ close }) => <QuickReactionsRow msg={msg} close={close} />,
      },
      {
        label: tBare('contextmenu.add_reaction'),
        action: () => {
          window.dispatchEvent(new CustomEvent('openReactionPicker', { detail: { messageId: msg.id, channelId: msg.channel_id, x: e.clientX, y: e.clientY } }));
        },
      },
    ];
  }
);