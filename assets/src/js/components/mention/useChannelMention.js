import { useState, useRef, useCallback } from 'react';
import { formatChannelMention } from './patterns';

export function useChannelMention(input, setInput, inputRef, channels) {
  const [active, setActive] = useState(null);
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(0);
  const channelMap = useRef(new Map());

  const detect = useCallback((value, cursorPos) => {
    const before = value.slice(0, cursorPos);
    const match = before.match(/#([^\s]*)$/);
    if (!match || (match.index > 0 && before[match.index - 1] !== ' ' && before[match.index - 1] !== '\n')) {
      setActive(null);
      setResults([]);
      return;
    }
    const query = match[1].toLowerCase();
    const matched = (channels || [])
      .filter(c => c.name.toLowerCase().includes(query))
      .slice(0, 6);
    setActive({ query, startIndex: before.length - match[0].length });
    setResults(matched);
    setIndex(0);
  }, [channels]);

  const select = useCallback((ch) => {
    if (!active) return;
    const before = input.slice(0, active.startIndex);
    const after = input.slice(active.startIndex + 1 + active.query.length);
    const inserted = `#${ch.name} `;
    setInput(before + inserted + after);
    channelMap.current.set(ch.name, ch.id);
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

  const buildContent = useCallback((text) => {
    let result = text;
    for (const [name, id] of channelMap.current) {
      result = result.replaceAll(`#${name}`, formatChannelMention(id));
    }
    return result;
  }, []);

  const clearMap = useCallback(() => channelMap.current.clear(), []);
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
    detect, select, buildContent, clearMap, dismiss, handleKeyDown,
  };
}