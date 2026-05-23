import React, { useState, useEffect, useCallback } from 'react';
import { apiCreateWebhook, apiListChannelWebhooks, apiUpdateWebhook, apiDeleteWebhook, apiRegenerateWebhookToken } from '../../api/webhooks';
import Spinner from '../ui/Spinner';
import WebhookAvatarBlock from './WebhookAvatarBlock';
import { TrashIcon, EditIcon, BoltIcon, CopyIcon, CheckIcon } from '../icons';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';

function timeAgo(iso) {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return new Date(iso).toLocaleDateString();
}

function CopyUrlButton({ url, label, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      onClick={onClick}
      disabled={!url}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${copied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white/85'} disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {copied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
      {copied ? copiedLabel : label}
    </button>
  );
}

export default function WebhooksTab({ channelId }) {
  const t = useT();
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    if (!channelId) return;
    setLoading(true);
    apiListChannelWebhooks(channelId)
      .then(r => setHooks(r.webhooks || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [channelId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true); setError('');
    try {
      const res = await apiCreateWebhook(channelId, { name });
      setHooks(list => [res, ...list]);
      setNewName('');
    } catch (e) { setError(e.message); }
    setCreating(false);
  };

  const startEdit = (h) => { setEditingId(h.id); setEditName(h.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); };

  const saveEdit = async (h) => {
    const name = editName.trim();
    if (!name || name === h.name) { cancelEdit(); return; }
    setBusyId(h.id);
    try {
      await apiUpdateWebhook(h.id, { name });
      setHooks(list => list.map(x => x.id === h.id ? { ...x, name } : x));
      cancelEdit();
    } catch (e) { setError(e.message); }
    setBusyId(null);
  };

  const toggleDisabled = async (h) => {
    setBusyId(h.id);
    try {
      await apiUpdateWebhook(h.id, { disabled: !h.disabled });
      setHooks(list => list.map(x => x.id === h.id ? { ...x, disabled: !h.disabled } : x));
    } catch (e) { setError(e.message); }
    setBusyId(null);
  };

  const remove = async (h) => {
    setBusyId(h.id);
    try {
      await apiDeleteWebhook(h.id);
      setHooks(list => list.filter(x => x.id !== h.id));
    } catch (e) { setError(e.message); }
    setBusyId(null);
  };

  const regenerate = async (h) => {
    setBusyId(h.id);
    try {
      const res = await apiRegenerateWebhookToken(h.id);
      setHooks(list => list.map(x => x.id === h.id ? { ...x, url: res.url } : x));
    } catch (e) { setError(e.message); }
    setBusyId(null);
  };

  return (
    <div className="p-6 max-w-3xl">
      <h3 className="text-sm font-semibold text-white/80 mb-1">{t('webhooks.tab.title')}</h3>
      <p className="text-xs text-white/40 mb-5">{t('webhooks.tab.description')}</p>

      <div className="rounded-lg bg-[var(--bg-tertiary)] border border-white/[0.06] p-3 mb-5">
        <label className="tw-label mb-1.5">{t('webhooks.tab.create_section')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('webhooks.tab.create_placeholder')}
            className="flex-1 tw-input px-3 py-2 text-[13px]"
            maxLength={80}
            onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          />
          <button
            onClick={create}
            disabled={creating || !newName.trim()}
            className="tw-btn-accent px-4 rounded-md disabled:opacity-40"
          >
            {creating ? t('webhooks.tab.btn_creating') : t('webhooks.tab.btn_create')}
          </button>
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400 mb-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : hooks.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-white/30 rounded-lg border border-dashed border-white/[0.08]">
          {t('webhooks.tab.empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {hooks.map(h => {
            const fullUrl = h.url ? `${window.location.origin}${h.url}` : '';
            return (
              <div key={h.id} className={`rounded-lg border p-3 ${h.disabled ? 'bg-white/[0.01] border-white/[0.04] opacity-60' : 'bg-[var(--bg-tertiary)] border-white/[0.06]'}`}>
                <div className="flex items-start gap-3">
                  <WebhookAvatarBlock
                    webhook={h}
                    onUpdated={(avatarId) => setHooks(list => list.map(x => x.id === h.id ? { ...x, avatar_id: avatarId } : x))}
                  />
                  <div className="min-w-0 flex-1">
                    {editingId === h.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(h); if (e.key === 'Escape') cancelEdit(); }}
                          className="flex-1 tw-input px-2 py-1 text-[13px]"
                          maxLength={80}
                        />
                        <button onClick={() => saveEdit(h)} disabled={busyId === h.id} className="text-[11px] font-semibold px-2 py-1 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-40">{t('webhooks.tab.btn_save')}</button>
                        <button onClick={cancelEdit} className="text-[11px] text-white/40 hover:text-white/60">{t('webhooks.tab.btn_cancel')}</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-white/85 truncate">{h.name}</span>
                        {h.disabled && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.08] text-white/40">{t('webhooks.tab.disabled_badge')}</span>}
                      </div>
                    )}
                    <div className="text-[11px] text-white/40 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{t('webhooks.tab.used_template').replace('{n}', (h.use_count || 0).toLocaleString())}</span>
                      <span>{t('webhooks.tab.last_template').replace('{when}', timeAgo(h.last_used_at))}</span>
                    </div>
                  </div>
                  {editingId !== h.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      {fullUrl && <CopyUrlButton url={fullUrl} label={t('webhooks.tab.btn_copy_url')} copiedLabel={t('webhooks.tab.btn_copied')} />}
                      <Tooltip text={t('webhooks.tab.btn_rename')}>
                        <button onClick={() => startEdit(h)} disabled={busyId === h.id} aria-label={t('webhooks.tab.btn_rename')} className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 disabled:opacity-40">
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip text={t('webhooks.tab.btn_regenerate')}>
                        <button onClick={() => regenerate(h)} disabled={busyId === h.id} aria-label={t('webhooks.tab.btn_regenerate')} className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-amber-400 disabled:opacity-40">
                          <BoltIcon className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip text={h.disabled ? t('webhooks.tab.btn_enable') : t('webhooks.tab.btn_disable')}>
                        <button onClick={() => toggleDisabled(h)} disabled={busyId === h.id} aria-label={h.disabled ? t('webhooks.tab.btn_enable') : t('webhooks.tab.btn_disable')} className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 disabled:opacity-40">
                          <span className={`block w-2 h-2 rounded-full ${h.disabled ? 'bg-white/30' : 'bg-emerald-400/60'}`} />
                        </button>
                      </Tooltip>
                      <Tooltip text={t('webhooks.tab.btn_delete')}>
                        <button onClick={() => remove(h)} disabled={busyId === h.id} aria-label={t('webhooks.tab.btn_delete')} className="p-1.5 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 disabled:opacity-40">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
                {!fullUrl && (
                  <div className="mt-2 ml-[58px]">
                    <button onClick={() => regenerate(h)} disabled={busyId === h.id} className="text-[11px] text-amber-400/70 hover:text-amber-300 disabled:opacity-40">
                      {t('webhooks.tab.url_missing')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}