import { useState, useCallback, useEffect, useRef } from 'react';

function hasFiles(e) {
  if (!e.dataTransfer) return false;
  const types = e.dataTransfer.types;
  if (!types) return false;
  if (typeof types.includes === 'function') return types.includes('Files');
  for (let i = 0; i < types.length; i++) if (types[i] === 'Files') return true;
  return false;
}

export default function useDragDrop(onFiles, { bindWindow = false, enabled = true } = {}) {
  const [dragging, setDragging] = useState(false);
  const depthRef = useRef(0);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  const reset = useCallback(() => {
    depthRef.current = 0;
    setDragging(false);
  }, []);

  const onDragEnter = useCallback((e) => {
    if (!enabled || !hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depthRef.current++;
    setDragging(true);
  }, [enabled]);

  const onDragLeave = useCallback((e) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setDragging(false);
  }, [enabled]);

  const onDragOver = useCallback((e) => {
    if (!enabled || !hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, [enabled]);

  const onDrop = useCallback((e) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    reset();
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) onFilesRef.current?.(files);
  }, [enabled, reset]);

  useEffect(() => {
    if (!bindWindow || !enabled) return;
    const handlers = { dragenter: onDragEnter, dragleave: onDragLeave, dragover: onDragOver, drop: onDrop };
    for (const [type, fn] of Object.entries(handlers)) {
      window.addEventListener(type, fn);
    }
    const onWinBlur = () => reset();
    window.addEventListener('blur', onWinBlur);
    return () => {
      for (const [type, fn] of Object.entries(handlers)) {
        window.removeEventListener(type, fn);
      }
      window.removeEventListener('blur', onWinBlur);
    };
  }, [bindWindow, enabled, onDragEnter, onDragLeave, onDragOver, onDrop, reset]);

  return {
    dragging,
    dragProps: { onDragEnter, onDragLeave, onDragOver, onDrop },
    reset,
  };
}