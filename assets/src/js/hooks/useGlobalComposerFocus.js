import { useEffect, useRef } from 'react';

function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useGlobalComposerFocus({ inputRef, value, onChange, active }) {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!active) return;

    const insertAtCursor = (text) => {
      const el = inputRef.current;
      if (!el) return;
      const wasFocused = document.activeElement === el;
      const v = valueRef.current || '';
      const start = wasFocused ? el.selectionStart : v.length;
      const end = wasFocused ? el.selectionEnd : v.length;
      const next = v.slice(0, start) + text + v.slice(end);
      onChangeRef.current(next);
      el.focus();
      const caret = start + text.length;
      requestAnimationFrame(() => {
        try { el.setSelectionRange(caret, caret); } catch (_) {}
      });
    };

    const onKeyDown = (e) => {
      if (isEditable(document.activeElement)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return;
      if (!inputRef.current) return;
      e.preventDefault();
      insertAtCursor(e.key);
    };

    const onPaste = (e) => {
      if (isEditable(document.activeElement)) return;
      if (!inputRef.current) return;
      const text = e.clipboardData?.getData('text') || '';
      if (!text) return;
      e.preventDefault();
      insertAtCursor(text);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPaste);
    };
  }, [active, inputRef]);
}