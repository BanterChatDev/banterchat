import React from 'react';
import { CloseIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function ImageUploadArea({
  uploading,
  dragging,
  dragProps,
  onClick,
  onRemove,
  hasImage,
  children,
}) {
  const t = useT();
  return (
    <div className="relative group" {...dragProps}>
      {children}
      <div
        onClick={onClick}
        className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'bg-[rgb(var(--accent-rgb)/0.4)] ring-2 ring-[var(--accent)] ring-inset'
            : 'bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100'
        }`}
      >
        {uploading ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="text-[9px] font-semibold text-white/80 uppercase tracking-wider">
              {dragging ? t('ui.image_upload_drop') : t('ui.image_upload_edit')}
            </span>
          </div>
        )}
      </div>
      {hasImage && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 right-1.5 z-10 bg-black/60 hover:bg-red-500/80 text-white/70 hover:text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
        >
          <CloseIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}