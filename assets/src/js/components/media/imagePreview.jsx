import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon } from '../icons';

export default function ImagePreview({ src, alt, className, width, height }) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(new Event('scrollUnlock'));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const aspectStyle = (width > 0 && height > 0) ? { aspectRatio: `${width} / ${height}` } : undefined;

  return (
    <>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={width || undefined}
        height={height || undefined}
        style={aspectStyle}
        className={`cursor-pointer hover:brightness-110 transition-all ${className || 'rounded max-h-60 w-auto object-contain bg-black/20'}`}
        onClick={() => { window.dispatchEvent(new Event('scrollLock')); setOpen(true); }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={close}>
          <button onClick={close} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10">
            <CloseIcon className="w-7 h-7" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}