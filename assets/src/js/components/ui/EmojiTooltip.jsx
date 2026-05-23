import React from 'react';
import Tooltip from './Tooltip';
import { u } from '../../api/routes';
import { t as tBare } from '../../lang/apply';

export default function EmojiTooltip({ emoji, guild, children, placement = 'top' }) {
  if (!emoji) return children;
  const isDefault = !emoji.guild_id;
  const originLine = isDefault
    ? tBare('emoji_tooltip.default_origin')
    : guild
      ? tBare('emoji_tooltip.guild_origin_template').replace('{guild}', guild.name)
      : tBare('emoji_tooltip.guild_origin_unknown');
  const card = (
    <div className="flex items-start gap-2.5 max-w-[260px]">
      <img
        src={u.emoji(emoji.id)}
        alt={`:${emoji.name}:`}
        className="w-12 h-12 flex-shrink-0 mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-white truncate">{`:${emoji.name}:`}</div>
        <div className="text-[11px] text-white/60 mt-0.5 leading-snug">{originLine}</div>
      </div>
    </div>
  );
  return <Tooltip content={card} placement={placement} maxWidth={280}>{children}</Tooltip>;
}