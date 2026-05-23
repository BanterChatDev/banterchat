import React, { useState, useRef, useCallback } from 'react';
import { apiUploadGuildEmoji, apiRenameGuildEmoji, apiDeleteGuildEmoji } from '../../api/emojis';
import { useGuildEmojiCache } from '../emoji';
import { useT } from '../../hooks/useT';
import { t as tBare } from '../../lang/apply';
import { CloseIcon } from '../icons';
import { u } from '../../api/routes';
import Tooltip from '../ui/Tooltip';
import CropModal from '../ui/CropModal';
import { useImageUpload } from '../../hooks/useImageUpload';

const MAX_EMOJI_BYTES = 256 * 1024;
const NAME_PATTERN = /^[a-zA-Z0-9_]{2,32}$/;
const PER_GUILD_LIMIT = 100;

export default function EmojisTab({ guildId }) {
  const t = useT();
  const cache = useGuildEmojiCache(guildId);
  const list = Array.from(cache.byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  const fileRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingName, setPendingName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  const stagedNameRef = useRef('');

  const img = useImageUpload({
    maxSize: MAX_EMOJI_BYTES,
    aspect: 1,
    applyCrop: true,
    cropTargetLongEdge: 256,
    upload: async (file) => {
      const name = stagedNameRef.current || file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
      setPendingFile(file);
      setPendingName(name);
      stagedNameRef.current = '';
      return { ok: true };
    },
    remove: async () => {},
  });

  const onPickFile = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_EMOJI_BYTES) {
      setError(tBare('emoji_settings.error_too_large_template').replace('{kb}', MAX_EMOJI_BYTES / 1024));
      e.target.value = '';
      return;
    }
    if (!pendingName) {
      stagedNameRef.current = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
    } else {
      stagedNameRef.current = pendingName;
    }
    img.processFile(file);
  };

  const onUpload = useCallback(async () => {
    setError('');
    if (!pendingFile) {
      setError(tBare('emoji_settings.error_no_file'));
      return;
    }
    if (!NAME_PATTERN.test(pendingName)) {
      setError(tBare('emoji_settings.error_bad_name'));
      return;
    }
    setBusy(true);
    try {
      await apiUploadGuildEmoji(guildId, pendingName, pendingFile);
      setPendingFile(null);
      setPendingName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(e.message || tBare('emoji_settings.error_upload_failed'));
    } finally {
      setBusy(false);
    }
  }, [guildId, pendingFile, pendingName]);

  const onCancelPending = () => {
    setPendingFile(null);
    setPendingName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const startRename = (em) => {
    setRenamingId(em.id);
    setRenameDraft(em.name);
  };

  const commitRename = async (em) => {
    if (!NAME_PATTERN.test(renameDraft) || renameDraft === em.name) {
      setRenamingId(null);
      return;
    }
    try {
      await apiRenameGuildEmoji(guildId, em.id, renameDraft);
      setRenamingId(null);
    } catch (e) {
      setError(e.message || tBare('emoji_settings.error_rename_failed'));
    }
  };

  const onDelete = async (em) => {
    if (!confirm(tBare('emoji_settings.delete_confirm_template').replace('{name}', em.name))) return;
    try {
      await apiDeleteGuildEmoji(guildId, em.id);
    } catch (e) {
      setError(e.message || tBare('emoji_settings.error_delete_failed'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white/80">{t('emoji_settings.heading')}</h3>
          <p className="text-[11px] text-white/25 mt-0.5">{t('emoji_settings.subtitle_template').replace('{count}', list.length).replace('{limit}', PER_GUILD_LIMIT)}</p>
        </div>
      </div>

      <div className="border border-white/[0.06] rounded-lg p-4 mb-5 bg-white/[0.02]">
        <h4 className="text-xs font-medium text-white/60 mb-3">{t('emoji_settings.upload_heading')}</h4>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={onPickFile}
            disabled={busy}
            className="text-xs text-white/55 file:mr-2 file:px-3 file:py-1.5 file:bg-white/[0.06] file:border file:border-white/[0.08] file:rounded-md file:text-white/70 file:text-xs file:cursor-pointer hover:file:bg-white/[0.10]"
          />
          {pendingFile && (
            <>
              <input
                type="text"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder={t('emoji_settings.name_placeholder')}
                maxLength={32}
                disabled={busy}
                className="bg-[var(--bg-input)] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-white/[0.12] flex-1"
              />
              <button
                onClick={onUpload}
                disabled={busy || !pendingName}
                className="tw-btn-accent px-4 py-1.5 rounded-md text-xs disabled:opacity-50"
              >
                {busy ? t('emoji_settings.btn_uploading') : t('emoji_settings.btn_upload')}
              </button>
              <Tooltip text={t('emoji_settings.btn_cancel')}>
                <button
                  onClick={onCancelPending}
                  disabled={busy}
                  aria-label={t('emoji_settings.btn_cancel')}
                  className="text-white/40 hover:text-white/70 transition-colors p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
        {error && <p className="text-[11px] text-red-400/80 mt-2">{error}</p>}
        <p className="text-[10px] text-white/20 mt-2">{t('emoji_settings.upload_hint_template').replace('{kb}', MAX_EMOJI_BYTES / 1024)}</p>
      </div>
      {img.cropFile && (
        <CropModal
          file={img.cropFile}
          aspect={img.cropAspect}
          onCrop={img.handleCropped}
          onClose={() => { img.clearCrop(); stagedNameRef.current = ''; if (fileRef.current) fileRef.current.value = ''; }}
        />
      )}

      {!cache.ready ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-white/20">{t('emoji_settings.empty_title')}</p>
          <p className="text-[11px] text-white/10 mt-1">{t('emoji_settings.empty_body')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {list.map((em) => (
            <div key={em.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-colors">
              <img src={u.emoji(em.id)} alt={`:${em.name}:`} className="w-7 h-7" />
              {renamingId === em.id ? (
                <input
                  autoFocus
                  type="text"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(em)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(em);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  maxLength={32}
                  className="bg-[var(--bg-input)] border border-white/[0.12] rounded-md px-2 py-1 text-xs text-white/85 focus:outline-none flex-1"
                />
              ) : (
                <button
                  onClick={() => startRename(em)}
                  className="text-xs text-white/70 hover:text-white text-left flex-1 truncate"
                >
                  :{em.name}:
                </button>
              )}
              {em.animated && (
                <span className="text-[9px] uppercase tracking-wider text-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.12)] px-1.5 py-0.5 rounded">{t('emoji_settings.badge_animated')}</span>
              )}
              <Tooltip text={t('emoji_settings.btn_delete')}>
                <button
                  onClick={() => onDelete(em)}
                  aria-label={t('emoji_settings.btn_delete')}
                  className="text-white/30 hover:text-red-400 transition-colors p-1"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}