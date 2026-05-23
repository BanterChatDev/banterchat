import React, { useState, useEffect } from 'react';
import { listApps, createApp } from '../../api/developers';
import TokenRevealModal from './TokenRevealModal';
import { PlusIcon } from '../icons';
import Spinner from '../ui/Spinner';
import Alert from '../ui/Alert';
import { useT } from '../../hooks/useT';

export default function AppListView({ onOpen }) {
  const t = useT();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tokenModal, setTokenModal] = useState(null);

  const load = () => {
    setLoading(true);
    listApps()
      .then(setApps)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await createApp(name);
      setTokenModal({ name: result.application.name, token: result.token });
      setNewName('');
      setCreating(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{t('developers.list_heading')}</h2>
          <p className="text-sm text-white/40 mt-1">{t('developers.list_subtitle')}</p>
        </div>
        <button
          onClick={() => setCreating(x => !x)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-sm font-semibold text-white"
        >
          <PlusIcon className="w-4 h-4" />
          {creating ? t('common.cancel') : t('developers.btn_new_application')}
        </button>
      </div>

      {creating && (
        <form onSubmit={onCreate} className="mb-6 p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{t('developers.label_application_name')}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t('developers.placeholder_application_name')}
              maxLength={32}
              autoFocus
              className="flex-1 px-3 py-2 rounded-md bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm text-white/90 focus:outline-none focus:border-[var(--border-focus)]"
            />
            <button
              type="submit"
              disabled={submitting || !newName.trim()}
              className="px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? t('developers.btn_creating') : t('developers.btn_create')}
            </button>
          </div>
          <p className="text-xs text-white/30 mt-2">{t('developers.name_hint')}</p>
        </form>
      )}

      {error && <Alert className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 border border-white/[0.08] border-dashed rounded-lg">
          <p className="text-sm text-white/40">{t('developers.list_empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map(app => (
            <button
              key={app.id}
              onClick={() => onOpen(app.id)}
              className="w-full text-left p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] hover:border-white/[0.14] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {app.name}
                    {app.discriminator && <span className="text-white/35 font-normal ml-1">#{app.discriminator}</span>}
                  </h3>
                  <p className="text-[11px] text-white/30 mt-0.5 font-mono truncate">{t('developers.list_app_id_template').replace('{id}', app.id)}</p>
                </div>
                <span className="text-xs text-white/30">{t('developers.list_open_arrow')}</span>
              </div>
              {app.description && <p className="text-xs text-white/50 mt-2 line-clamp-2">{app.description}</p>}
            </button>
          ))}
        </div>
      )}

      <TokenRevealModal
        isOpen={!!tokenModal}
        onClose={() => setTokenModal(null)}
        appName={tokenModal?.name || ''}
        token={tokenModal?.token || ''}
      />
    </div>
  );
}