import { useRef, useEffect, useCallback } from 'react';

const PAUSE_MS = 500;
const MAX_STACK = 100;

export function useTextHistory(value, onChange, inputRef) {
  const undoStack = useRef([{ value: value || '', selectionStart: 0, selectionEnd: 0 }]);
  const redoStack = useRef([]);
  const lastValue = useRef(value || '');
  const pauseTimer = useRef(null);
  const suppressNext = useRef(false);

  const snapshot = useCallback(() => {
    const el = inputRef.current;
    const snap = {
      value: lastValue.current,
      selectionStart: el?.selectionStart || lastValue.current.length,
      selectionEnd: el?.selectionEnd || lastValue.current.length,
    };
    const top = undoStack.current[undoStack.current.length - 1];
    if (top && top.value === snap.value) return;
    undoStack.current.push(snap);
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
    redoStack.current = [];
  }, [inputRef]);

  useEffect(() => {
    if (value === lastValue.current) return;
    if (suppressNext.current) {
      suppressNext.current = false;
      lastValue.current = value;
      return;
    }
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => {
      snapshot();
      pauseTimer.current = null;
    }, PAUSE_MS);
    lastValue.current = value;
  }, [value, snapshot]);

  useEffect(() => () => { if (pauseTimer.current) clearTimeout(pauseTimer.current); }, []);

  const markCommit = useCallback(() => {
    if (pauseTimer.current) { clearTimeout(pauseTimer.current); pauseTimer.current = null; }
    snapshot();
  }, [snapshot]);

  const apply = useCallback((snap) => {
    suppressNext.current = true;
    lastValue.current = snap.value;
    onChange(snap.value);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(snap.selectionStart, snap.selectionEnd);
      } catch (_) { /* no-op for elements that don't support setSelectionRange */ }
    });
  }, [onChange, inputRef]);

  const undo = useCallback(() => {
    if (pauseTimer.current) { clearTimeout(pauseTimer.current); pauseTimer.current = null; snapshot(); }
    if (undoStack.current.length < 2) return;
    const current = undoStack.current.pop();
    redoStack.current.push(current);
    const prev = undoStack.current[undoStack.current.length - 1];
    apply(prev);
  }, [apply, snapshot]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(next);
    apply(next);
  }, [apply]);

  const handleKeyDown = useCallback((e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return false;
    const k = e.key.toLowerCase();
    if (k === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return true;
    }
    if (k === 'y' && !e.shiftKey) {
      e.preventDefault();
      redo();
      return true;
    }
    return false;
  }, [undo, redo]);

  return { handleKeyDown, markCommit };
}