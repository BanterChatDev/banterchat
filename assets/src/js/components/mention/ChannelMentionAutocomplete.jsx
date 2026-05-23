import React from 'react';
import AutocompleteDropdown from './AutocompleteDropdown';
import { useT } from '../../hooks/useT';

export default function ChannelMentionAutocomplete({ channels, activeIndex, onSelect, onHover }) {
  const t = useT();
  return (
    <AutocompleteDropdown
      title={t('mention.autocomplete_channels')}
      items={channels}
      itemKey="id"
      activeIndex={activeIndex}
      onSelect={onSelect}
      onHover={onHover}
      renderItem={(ch) => (
        <>
          <span className="text-white/45 text-xs leading-none">#</span>
          <span className="text-xs font-medium text-white/85 truncate">{ch.name}</span>
          {ch.description && <span className="text-[10px] text-white/45 truncate ml-auto">{ch.description}</span>}
        </>
      )}
    />
  );
}