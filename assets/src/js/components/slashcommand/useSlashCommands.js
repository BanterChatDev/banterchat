import { useState, useCallback, useRef, useEffect } from 'react';
import { apiListGuildCommands } from '../../api/slashcommands';
import { registerResetHandler } from '../../cache';

const guildCache = new Map();
const invalidationListeners = new Map();

registerResetHandler(() => {
  for (const [guildId, listeners] of invalidationListeners.entries()) {
    guildCache.delete(guildId);
    listeners.forEach(fn => { try { fn(); } catch {} });
  }
  guildCache.clear();
});

function fetchCommands(guildId) {
  if (!guildId) return Promise.resolve([]);
  const cached = guildCache.get(guildId);
  if (cached && Date.now() - cached.at < 60000) return Promise.resolve(cached.data);
  return apiListGuildCommands(guildId)
    .then(data => {
      const list = data?.commands || [];
      guildCache.set(guildId, { data: list, at: Date.now() });
      return list;
    })
    .catch(() => []);
}

export function invalidateSlashCommands(guildId) {
  if (!guildId) return;
  guildCache.delete(guildId);
  const set = invalidationListeners.get(guildId);
  if (set) set.forEach(fn => { try { fn(); } catch {} });
}

function subscribe(guildId, fn) {
  let set = invalidationListeners.get(guildId);
  if (!set) { set = new Set(); invalidationListeners.set(guildId, set); }
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) invalidationListeners.delete(guildId);
  };
}

export function useSlashCommands(input, setInput, inputRef, guildId, channelId) {
  // Autocomplete state (before a command is selected).
  const [active, setActive] = useState(null);
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(0);
  const allRef = useRef([]);
  // Arg-entry state (after a command is selected).
  const [activeCmd, setActiveCmd] = useState(null);
  const [args, setArgs] = useState({});

  useEffect(() => {
    if (!guildId) { allRef.current = []; return; }
    let cancelled = false;
    const load = () => {
      fetchCommands(guildId).then(list => {
        if (!cancelled) allRef.current = list;
      });
    };
    load();
    const unsub = subscribe(guildId, load);
    return () => { cancelled = true; unsub(); };
  }, [guildId]);

  const detect = useCallback((value, cursorPos) => {
    if (activeCmd) return; // don't autocomplete while entering args
    const before = value.slice(0, cursorPos);
    if (!before.startsWith('/')) { setActive(null); setResults([]); return; }
    const match = before.match(/^\/([a-zA-Z0-9_-]*)$/);
    if (!match) { setActive(null); setResults([]); return; }
    const query = match[1].toLowerCase();
    const matched = allRef.current
      .filter(c => c.name.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.name.length - b.name.length;
      })
      .slice(0, 8);
    setActive({ query, startIndex: 0, endIndex: before.length });
    setResults(matched);
    setIndex(0);
  }, [activeCmd]);

  // Coerce raw arg state to the wire shape declared by the command's
  // options. Returns null if a required arg is missing or an integer
  // arg won't parse — caller treats null as "don't send".
  const buildPayload = useCallback((cmd, rawArgs) => {
    const options = cmd.options || [];
    for (const o of options) {
      if (o.required && (rawArgs[o.name] === undefined || rawArgs[o.name] === '')) {
        return null;
      }
    }
    const coerced = {};
    for (const o of options) {
      const v = rawArgs[o.name];
      if (v === undefined || v === '') continue;
      if (o.type === 'integer') {
        const n = parseInt(v, 10);
        if (Number.isNaN(n)) return null;
        coerced[o.name] = n;
      } else if (o.type === 'boolean') {
        coerced[o.name] = v === true || v === 'true';
      } else {
        coerced[o.name] = v;
      }
    }
    return {
      type: 'slash_command',
      payload: {
        command: cmd.name,
        bot_user_id: cmd.bot_user_id || '',
        channel_id: channelId || '',
        guild_id: guildId || '',
        options: coerced,
      },
    };
  }, [channelId, guildId]);

  const sendPacket = useCallback((packet) => {
    console.info('[slash] submit', packet.payload);
    const ok = window.__wsSend?.(packet);
    if (ok === false) { console.warn('[slash] ws send returned false', packet.payload); return false; }
    return true;
  }, []);

  const select = useCallback((item) => {
    if (!item) return;
    // Clear the "/foo" draft from the input.
    setInput('');
    setActive(null);
    setResults([]);
    // Normalize options (server may send raw JSON string or array).
    let options = item.options;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch { options = []; }
    }
    if (!Array.isArray(options)) options = [];
    // Zero-option command: fire immediately, never enter arg-entry mode.
    // Skipping arg mode means the composer input stays mounted and the
    // user can keep typing normal messages instead of being locked.
    if (options.length === 0) {
      const packet = buildPayload({ ...item, options }, {});
      if (packet) sendPacket(packet);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    setActiveCmd({ ...item, options });
    const initial = {};
    for (const o of options) {
      if (o.default !== undefined) initial[o.name] = o.default;
    }
    setArgs(initial);
  }, [setInput, buildPayload, sendPacket, inputRef]);

  const setArg = useCallback((name, value) => {
    setArgs(prev => ({ ...prev, [name]: value }));
  }, []);

  const cancel = useCallback(() => {
    setActiveCmd(null);
    setArgs({});
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);

  const submit = useCallback(() => {
    if (!activeCmd) return false;
    const packet = buildPayload(activeCmd, args);
    if (!packet) return false;
    if (!sendPacket(packet)) return false;
    setActiveCmd(null);
    setArgs({});
    requestAnimationFrame(() => inputRef.current?.focus());
    return true;
  }, [activeCmd, args, buildPayload, sendPacket, inputRef]);

  const dismiss = useCallback(() => { setActive(null); setResults([]); }, []);

  const handleKeyDown = useCallback((e) => {
    if (activeCmd) {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); return true; }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
        return true;
      }
      return false;
    }
    if (!active || results.length === 0) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(p => (p + 1) % results.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(p => (p - 1 + results.length) % results.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); select(results[index]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); return true; }
    return false;
  }, [active, activeCmd, results, index, select, submit, cancel, dismiss]);

  return {
    isActive: !!active && results.length > 0,
    results, index, setIndex,
    detect, select, dismiss, handleKeyDown,
    // Arg-entry surface:
    inArgMode: !!activeCmd,
    activeCmd,
    args, setArg, submit, cancel,
  };
}