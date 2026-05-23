import { useEffect } from 'react';

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[400px] bg-app-bg border border-app-border rounded-lg p-5" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="text-[14px] font-semibold text-white/90 mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}