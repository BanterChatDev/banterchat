import React, { useState, useEffect, useCallback } from 'react';

let toastId = 0;

export default function Notifications() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((detail) => {
    const id = ++toastId;
    const type = detail.type || 'error';
    const duration = detail.duration || 4000;
    setToasts(prev => [...prev.slice(-4), { id, message: detail.message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  useEffect(() => {
    const handler = (e) => addToast(e.detail);
    window.addEventListener('appNotification', handler);
    return () => window.removeEventListener('appNotification', handler);
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-[13px] font-medium animate-[slideIn_0.2s_ease-out] max-w-xs ${
            t.type === 'error' ? 'bg-red-500/90 text-white' :
            t.type === 'warn' ? 'bg-amber-500/90 text-white' :
            'bg-[var(--bg-tertiary)] text-white/80 border border-white/[0.08]'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function notify(message, type = 'error', duration = 4000) {
  window.dispatchEvent(new CustomEvent('appNotification', { detail: { message, type, duration } }));
}