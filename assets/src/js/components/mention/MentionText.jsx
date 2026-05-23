import React, { useState, useEffect } from 'react';
import { getUserById, fetchUserById, getRoleById, onCacheUpdated, fetchRolesForGuild } from './userCache';
import { resolveDisplayName } from '../../utils/displayName';
import { hasPerm, PERM_MENTION_EVERYONE } from '../../permissions';
import { Markdown } from '../markdown';
import { MENTION_RE, USER_MENTION_RE, hasMentions } from './patterns';
import { useSwitchChannel } from '../../hooks/useSwitchChannel';
import { useT } from '../../hooks/useT';

export default function MentionText({ content, onMentionClick, authorPerms, guildId, embedGifs = false, inline = false }) {
  const switchChannel = useSwitchChannel();
  const t = useT();
  useEffect(() => {
    if (guildId) fetchRolesForGuild(guildId);
  }, [guildId]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!content || (!content.includes('<@') && !content.includes('<&'))) return;
    const ids = [...content.matchAll(USER_MENTION_RE)].map(m => m[1]);
    const missing = ids.filter(id => id !== 'everyone' && !getUserById(id));
    if (missing.length === 0) return;
    missing.forEach(id => fetchUserById(id));
    return onCacheUpdated(() => {
      if (ids.some(id => id !== 'everyone' && !getUserById(id))) return;
      setTick(t => t + 1);
    });
  }, [content]);

  if (!content) return null;
  if (!hasMentions(content)) return <Markdown text={content} inline={inline} embedGifs={embedGifs} />;

  const tokens = [];
  let last = 0;
  let match;
  MENTION_RE.lastIndex = 0;

  while ((match = MENTION_RE.exec(content)) !== null) {
    if (match.index > last) tokens.push(<Markdown key={`md${match.index}`} text={content.slice(last, match.index)} inline embedGifs={embedGifs} />);
    const raw = match[0];
    if (raw === '<@everyone>') {
      const canMention = hasPerm(authorPerms || 0, PERM_MENTION_EVERYONE);
      tokens.push(canMention
        ? <span key={`e${match.index}`} className="inline px-1 rounded bg-[rgb(var(--accent-warning-rgb)/0.15)] text-[var(--accent-warning)] font-medium">@everyone</span>
        : <span key={`e${match.index}`} className="text-white/65">@everyone</span>
      );
    } else if (raw.startsWith('<&')) {
      const roleId = match[1];
      const idx = match.index;
      const role = getRoleById(roleId, guildId);
      const canMention = hasPerm(authorPerms || 0, PERM_MENTION_EVERYONE) || role?.mentionable;
      tokens.push(canMention
        ? <span key={`r${idx}`} className="inline px-1 rounded font-medium transition-colors" style={{ backgroundColor: `${role?.color || '#5865f2'}20`, color: role?.color || '#949cf7' }}>@{role?.name || t('mention.unknown_role')}</span>
        : <span key={`r${idx}`} className="text-white/65">@{role?.name || t('mention.unknown_role')}</span>
      );
    } else if (raw.startsWith('<#')) {
      const channelId = match[1];
      tokens.push(
        <span key={`ch${match.index}`} onClick={(e) => { e.stopPropagation(); switchChannel(channelId, guildId); }} className="inline px-1 rounded bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/70 cursor-pointer font-medium transition-colors">
          #{window.__channelNames?.[channelId] || t('mention.unknown_channel')}
        </span>
      );
    } else {
      const userId = match[1];
      const user = getUserById(userId);
      tokens.push(
        <span key={`u${match.index}`} onClick={(e) => { e.stopPropagation(); onMentionClick?.(userId, e); }} className="inline px-1 rounded bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.25)] cursor-pointer font-medium transition-colors">
          @{user ? resolveDisplayName(user) : t('mention.unknown_channel')}
        </span>
      );
    }
    last = MENTION_RE.lastIndex;
  }

  if (last < content.length) tokens.push(<Markdown key="mdtail" text={content.slice(last)} inline embedGifs={embedGifs} />);
  return <>{tokens}</>;
}