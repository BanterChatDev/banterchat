import { useState, useCallback } from 'react';
import { useDefaultEmojis, useGuildEmojiCache } from './useGuildEmojiCache';

const MAX_RESULTS = 8;
const NAME_PATTERN = /:([a-zA-Z0-9_+-]{2,})$/;

export function useEmojiAutocomplete(input, setInput, inputRef, guildId) {
  const defaults = useDefaultEmojis();
  const guild = useGuildEmojiCache(guildId);
  const [active, setActive] = useState(null);
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(0);

  const detect = useCallback((value, cursorPos) => {
    const before = value.slice(0, cursorPos);
    const match = before.match(NAME_PATTERN);
    if (!match) {
      setActive(null);
      setResults([]);
      return;
    }
    const query = match[1].toLowerCase();
    const seen = new Set();
    const candidates = [];
    for (const em of guild.byId.values()) {
      if (em.name.toLowerCase().includes(query) && !seen.has(em.id)) {
        seen.add(em.id);
        candidates.push(em);
      }
    }
    for (const em of defaults.byId.values()) {
      if (em.name.toLowerCase().includes(query) && !seen.has(em.id)) {
        seen.add(em.id);
        candidates.push(em);
      }
    }
    const lowerQuery = query;
    candidates.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      return aStarts - bStarts || a.name.length - b.name.length;
    });
    setActive({ query, startIndex: before.length - match[0].length });
    setResults(candidates.slice(0, MAX_RESULTS));
    setIndex(0);
  }, [defaults.byId, guild.byId]);

  const select = useCallback((item) => {
    if (!active) return;
    const before = input.slice(0, active.startIndex);
    const after = input.slice(active.startIndex + 1 + active.query.length);
    const tag = item.animated ? `<a:${item.name}:${item.id}>` : `<:${item.name}:${item.id}>`;
    const inserted = tag + ' ';
    setInput(before + inserted + after);
    setActive(null);
    setResults([]);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = before.length + inserted.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  }, [active, input, setInput, inputRef]);

  const dismiss = useCallback(() => { setActive(null); setResults([]); }, []);

  const handleKeyDown = useCallback((e) => {
    if (!active || results.length === 0) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(p => (p + 1) % results.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(p => (p - 1 + results.length) % results.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); select(results[index]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); return true; }
    return false;
  }, [active, results, index, select, dismiss]);

  return {
    isActive: !!active && results.length > 0,
    results, index, setIndex,
    detect, select, dismiss, handleKeyDown,
  };
}