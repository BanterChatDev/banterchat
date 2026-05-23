import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((opts) => {
    const id = ++nextId;
    const toast = {
      id,
      kind: opts.kind || 'info',
      message: opts.message || '',
      duration: opts.duration ?? 3500,
    };
    setToasts((list) => [...list, toast]);
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration);
    }
    return id;
  }, [dismiss]);

  const api = { push, dismiss };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const kindStyles = {
    info: 'bg-app-bg-2 border-app-border text-app-text',
    success: 'bg-app-success/15 border-app-success/40 text-app-success',
    error: 'bg-app-danger/15 border-app-danger/40 text-app-danger',
    warning: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200',
  };
  return (
    <div
      onClick={onDismiss}
      className={`pointer-events-auto cursor-pointer min-w-[240px] max-w-[360px] px-4 py-2.5 rounded-md border text-[12px] shadow-lg transition-all duration-200 ${kindStyles[toast.kind]} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
      role="status"
    >
      {toast.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}