import React from 'react';
import { AutocompleteDropdown } from '../mention';
import { useT } from '../../hooks/useT';

function hasOptions(c) {
  if (!c.options) return false;
  if (Array.isArray(c.options)) return c.options.length > 0;
  if (typeof c.options === 'string') {
    try {
      const parsed = JSON.parse(c.options);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

export default function SlashAutocomplete({ commands, activeIndex, onSelect, onHover }) {
  const t = useT();
  return (
    <AutocompleteDropdown
      title={t('slash.autocomplete_title')}
      items={commands}
      itemKey="name"
      activeIndex={activeIndex}
      onSelect={onSelect}
      onHover={onHover}
      renderItem={(c) => (
        <>
          <span className="text-[13px] text-white/85 font-medium">/{c.name}</span>
          <span className="text-xs text-white/40 truncate flex-1">{c.description}</span>
          {hasOptions(c) && (
            <span className="text-[9px] text-blue-300/70 uppercase tracking-wide mr-1">{t('slash.args_badge')}</span>
          )}
          <span className="text-[10px] text-white/30 uppercase tracking-wide">{c.bot_name}</span>
        </>
      )}
    />
  );
}