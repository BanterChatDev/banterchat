import React, { useState, useRef, useCallback } from 'react';
import Spinner from './Spinner';
import { useT } from '../../hooks/useT';

// Single-file picker with drag-and-drop.
//
// Props:
//   onFile         — async (File) => void | Promise<void>. Called when
//                    the user picks or drops a file. Component shows a
//                    spinner while the promise is pending. Throw to
//                    surface an error via the `error` prop instead.
//   filename       — currently chosen filename (drives the
//                    "Choose a file" → "<name>" label flip). Pass ''
//                    or null when there's no file. Owned by the parent
//                    so it can reset after submit.
//   accept         — passed to the underlying <input accept=...>.
//                    Default '*' lets anything through.
//   prompt         — primary label when no file is chosen. Defaults to
//                    a generic t() key.
//   error          — optional error string shown under the area in red.
//   disabled       — disables both clicks and drops.
//   dragHint       — text shown while a file is hovering. Default i18n.
export default function FileUploadArea({
  onFile,
  filename = '',
  accept = '*',
  prompt,
  error = '',
  disabled = false,
  dragHint,
}) {
  const t = useT();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragCounter = useRef(0);

  const handleFile = useCallback(async (file) => {
    if (!file || disabled) return;
    setBusy(true);
    try {
      await onFile(file);
    } finally {
      setBusy(false);
      // Reset the underlying input so picking the same file twice fires onChange
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onFile, disabled]);

  const onChange = (e) => handleFile(e.target.files?.[0]);

  // Drag-and-drop. dragenter/dragleave fire on every child, so use a
  // counter to track the actual hover state at the area boundary.
  const onDragEnter = (e) => {
    e.preventDefault();
    if (disabled) return;
    dragCounter.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) setDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const labelClass = [
    'block w-full rounded-xl border px-3 py-3 text-center text-sm transition-colors',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    dragging
      ? 'border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.1)]'
      : 'border-white/[0.08] bg-[var(--bg-tertiary)] hover:border-white/20',
  ].join(' ');

  const promptText = prompt || t('ui.file_upload.choose_file');
  const dragText = dragHint || t('ui.file_upload.drop_here');

  return (
    <div>
      <label
        className={labelClass}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <span className={filename ? 'text-white/85' : 'text-white/40'}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="xs" />
              <span>{t('ui.file_upload.reading')}</span>
            </span>
          ) : dragging ? dragText
            : filename || promptText}
        </span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={onChange}
          disabled={disabled || busy}
        />
      </label>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}