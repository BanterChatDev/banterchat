import React from 'react';
import AutocompleteDropdown from './AutocompleteDropdown';
import UserAvatar from '../user/UserAvatar';
import { resolveNameColor, NEUTRAL_MENTION_COLOR } from '../../utils/userColor';
import { useT } from '../../hooks/useT';
import { resolveDisplayName } from '../../utils/displayName';

function mentionItemColor(u, isDM) {
  if (u._type === 'everyone' || u._type === 'role') {
    return u.role_color || NEUTRAL_MENTION_COLOR;
  }
  return resolveNameColor({ source: u, isDM, fallback: NEUTRAL_MENTION_COLOR });
}

export default function MentionAutocomplete({ users, activeIndex, onSelect, onHover, isDM }) {
  const t = useT();
  return (
    <AutocompleteDropdown
      title={t('mention.autocomplete_users')}
      items={users}
      itemKey="id"
      activeIndex={activeIndex}
      onSelect={onSelect}
      onHover={onHover}
      renderItem={(u) => {
        const isUserItem = u._type !== 'everyone' && u._type !== 'role';
        const primary = isUserItem ? resolveDisplayName(u) : u.username;
        const showHandle = isUserItem && u.display_name && u.display_name.trim() && u.display_name.trim() !== u.username;
        return (
          <>
            <UserAvatar username={u.username} avatarId={u.avatar_id} userId={u.id} size="sm" />
            <span className="text-xs font-medium truncate" style={{ color: mentionItemColor(u, isDM) }}>{primary}</span>
            {showHandle && <span className="text-[10px] text-white/55 truncate">@{u.username}</span>}
            {u._type === 'everyone' ? (
              <span className="text-[10px] text-[rgb(var(--accent-warning-rgb)/0.7)] truncate ml-auto">{t('mention.badge_notify_all')}</span>
            ) : u._type === 'role' ? (
              <span className="text-[10px] text-white/45 truncate ml-auto">{t('mention.badge_role')}</span>
            ) : u.roles && u.roles.length > 0 ? (
              <span className="text-[10px] text-white/45 truncate ml-auto">{u.roles[0].name}</span>
            ) : null}
          </>
        );
      }}
    />
  );
}