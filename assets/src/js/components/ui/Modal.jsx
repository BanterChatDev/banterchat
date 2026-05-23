import React, { useEffect } from 'react';
import { useMountTransition } from '../../hooks/useMountTransition';
import GlassShine from '../theme/GlassShine';

const SIZES = { sm: 'max-w-modal-sm', md: 'max-w-modal-md', lg: 'max-w-modal-lg', xl: 'max-w-modal-xl' };
const MODAL_EXIT_MS = 180;

export default function Modal({ isOpen, onClose, children, size = 'md', padding = true, heightClass = '' }) {
  const { shouldRender, isExiting } = useMountTransition(isOpen, MODAL_EXIT_MS);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const backdropAnim = isExiting ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop';
  const popAnim = isExiting ? 'animate-modal-pop-out' : 'animate-modal-pop';

  return (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-fluid-4 ${backdropAnim}`} onClick={onClose}>
      <div
        className={`relative bg-[var(--bg-base)] border border-white/[0.08] rounded-fluid-3 shadow-2xl w-full overflow-hidden ${popAnim} ${SIZES[size] || SIZES.md} ${heightClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassShine />
        {padding ? (
          <div className="relative z-[1] px-fluid-6 pt-fluid-4 pb-fluid-3">
            {children}
          </div>
        ) : (
          <div className="relative z-[1]">{children}</div>
        )}
      </div>
    </div>
  );
}

export function ModalHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-fluid-3 mb-fluid-4">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center text-[var(--accent)]">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-fluid-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-fluid-xs text-white/30 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function ModalActions({ children }) {
  return <div className="flex gap-fluid-2 mt-fluid-2 pt-fluid-3 border-t border-white/[0.06]">{children}</div>;
}

export function ModalError({ message }) {
  if (!message) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-fluid-3 py-fluid-2 mb-fluid-3">
      <p className="text-fluid-xs text-red-400">{message}</p>
    </div>
  );
}