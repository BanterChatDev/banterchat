import React from 'react';
import { AutocompleteDropdown } from '../mention';
import { useT } from '../../hooks/useT';
import { u } from '../../api/routes';

export default function EmojiAutocomplete({ emojis, activeIndex, onSelect, onHover }) {
  const t = useT();
  return (
    <AutocompleteDropdown
      title={t('emoji_picker.autocomplete_title')}
      items={emojis}
      itemKey="id"
      activeIndex={activeIndex}
      onSelect={onSelect}
      onHover={onHover}
      renderItem={(e) => (
        <>
          <img src={u.emoji(e.id)} alt={`:${e.name}:`} className="inline-block w-5 h-5 leading-none" />
          <span className="text-xs text-white/50 truncate">:{e.name}:</span>
        </>
      )}
    />
  );
}