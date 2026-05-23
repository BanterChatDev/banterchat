import React, { useEffect, useState } from 'react';
import { listAppCommands } from '../../api/developers';
import Spinner from '../ui/Spinner';
import Alert from '../ui/Alert';
import { useT } from '../../hooks/useT';

export default function CommandsTab({ app }) {
  const t = useT();
  const [cmds, setCmds] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setCmds(null);
    setError('');
    listAppCommands(app.id)
      .then(d => setCmds(d.commands || []))
      .catch(e => setError(e.message));
  }, [app.id]);

  if (error) return <div className="max-w-2xl mx-auto"><Alert>{error}</Alert></div>;
  if (cmds === null) return <div className="py-12 flex justify-center"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">{t('developers.commands_heading')}</h2>
        <p className="text-sm text-white/40 mt-1">{t('developers.commands_subtitle')}</p>
      </div>

      {cmds.length === 0 ? (
        <div className="text-center py-16 border border-white/[0.08] border-dashed rounded-lg">
          <p className="text-sm text-white/40">{t('developers.commands_empty')}</p>
          <p className="text-xs text-white/25 mt-2">{t('developers.commands_empty_hint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cmds.map(c => (
            <div key={c.name} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-lg">
              <div className="flex items-baseline gap-2">
                <code className="text-sm font-mono text-[var(--text-primary)]">/{c.name}</code>
                <span className="text-xs text-white/40 truncate">{c.description}</span>
              </div>
              {c.options && (
                <pre className="mt-2 px-2 py-1.5 bg-[var(--bg-tertiary)] rounded text-[11px] font-mono text-white/50 overflow-x-auto">{JSON.stringify(c.options, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}