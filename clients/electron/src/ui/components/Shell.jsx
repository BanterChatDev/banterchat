import { useState, useEffect } from 'react';
import { initI18n } from '../lib/i18n';

export function Shell({ boot, children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tasks = [initI18n()];
    if (typeof boot === 'function') tasks.push(boot());
    Promise.all(tasks).then(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="h-full flex items-center justify-center text-app-text-muted text-[12px]">…</div>;
  }
  return children;
}