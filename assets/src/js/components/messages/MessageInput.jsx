import React, { useState, useRef, useCallback, useEffect } from 'react';
import { canSendInChannel, canAttachInChannel, resolveChannelPerms } from '../../permissions';
import { useBlocks } from '../../hooks/useBlocks';
import { useGuildMe } from '../../hooks/useGuildMe';
import { MentionText } from '../mention';
import { SlashArgChips, useSlashCommands } from '../slashcommand';
import { uploadFile } from '../../api/upload';
import { getDraft, setDraft, clearDraft } from '../../utils/draftCache';
import VoiceComposer from './VoiceComposer';
import GifPicker from '../gifs/GifPicker';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { computeWaveform } from '../../utils/waveform';
import { MAX_FILE_SIZE, MAX_FILE_COUNT, MAX_MESSAGE_LENGTH } from '../../config';
import { resolveDisplayName } from '../../utils/displayName';
import CharCount from './CharCount';
import { CloseIcon, PlusIcon, DocumentIcon } from '../icons';
import AttachMenu from './AttachMenu';
import InputStateBar from './InputStateBar';
import SlowmodeHint from './SlowmodeHint';
import Tooltip from '../ui/Tooltip';
import { hasPerm } from '../../permissions';
import { PERM_MANAGE_CHANNELS, PERM_MANAGE_MESSAGES } from '../../permissions/perms';
import { formatSize } from '../../utils/formatSize';
import WarningBar from './WarningBar';
import { on } from '../../eventBus';
import { useT } from '../../hooks/useT';
import { useTextHistory } from '../../hooks/useTextHistory';
import { useGlobalComposerFocus } from '../../hooks/useGlobalComposerFocus';
import { RichTextComposer } from '../composer';

export default function MessageInput({ channelName, onSend, disabled, user, channel, channels, categories, guildId }) {
  const t = useT();
  const { data: guildMe } = useGuildMe(guildId, user?.id);
  const [input, setInput] = useState(() => getDraft(channel?.id));
  const prevChannelIdRef = useRef(channel?.id);
  useEffect(() => {
    const prev = prevChannelIdRef.current;
    if (prev === channel?.id) return;
    if (prev) setDraft(prev, input);
    setInput(getDraft(channel?.id));
    prevChannelIdRef.current = channel?.id;
  }, [channel?.id]);
  useEffect(() => {
    if (!channel?.id) return;
    setDraft(channel.id, input);
  }, [input, channel?.id]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [voiceSending, setVoiceSending] = useState(false);
  const [warning, setWarning] = useState(null);
  const warningTimerRef = useRef(null);
  const [slowmodeUntil, setSlowmodeUntil] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const attachBtnRef = useRef(null);
  const gifBtnRef = useRef(null);
  const isMobile = useIsMobile();
  const showWarning = useCallback((text, type = 'error', durationMs = 5000) => {
    setWarning({ text, type });
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setWarning(null), durationMs);
  }, []);

  const sendVoiceMessage = useCallback(async (file, durationMs, blob) => {
    if (!channel?.id) return;
    setVoiceMode(false);
    setVoiceSending(true);
    try {
      const durationSecs = Math.max(0.1, durationMs / 1000);
      const waveform = blob ? await computeWaveform(blob).catch(() => '') : '';
      const att = await uploadFile(file, channel.id, undefined, false, {
        duration_secs: durationSecs.toFixed(2),
        waveform,
      });
      window.__wsSend?.({
        type: 'message_send',
        payload: {
          channel_id: channel.id,
          content: '',
          attachment_ids: [att.id],
          flags: 8192,
        },
      });
    } catch (err) {
      showWarning(err.message || t('messages.input_warn_upload_failed'), 'error');
    } finally {
      setVoiceSending(false);
    }
  }, [channel?.id, showWarning, t]);
  useEffect(() => () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, []);

  useEffect(() => {
    const off = on('error', (data) => {
      if (!data?.message) return;
      const tone = data.code === 'rate_limited' ? 'warn' : 'error';
      const duration = data.code === 'rate_limited' && typeof data.retry_after === 'number'
        ? Math.max(1500, Math.ceil(data.retry_after * 1000))
        : 5000;
      showWarning(data.message, tone, duration);
    });
    return off;
  }, [showWarning]);

  useEffect(() => {
    const off = on('slowmodeHit', (data) => {
      if (typeof data?.retry_after !== 'number') return;
      setSlowmodeUntil(Date.now() + data.retry_after * 1000);
    });
    return off;
  }, []);

  useEffect(() => {
    setSlowmodeUntil(0);
  }, [channel?.id]);

  useEffect(() => {
    if (slowmodeUntil <= Date.now()) return;
    const id = setTimeout(() => setSlowmodeUntil(0), slowmodeUntil - Date.now() + 50);
    return () => clearTimeout(id);
  }, [slowmodeUntil]);

  const makeSafeThumb = useCallback((file) => {
    if (!file.type?.startsWith('image/')) return Promise.resolve(null);
    const maxDim = 8192;
    return file.slice(0, 30).arrayBuffer().then(buf => {
      const v = new DataView(buf);
      let blocked = false;
      if (v.getUint32(0) === 0x89504E47) {
        blocked = v.getUint32(16) > maxDim || v.getUint32(20) > maxDim;
      } else if (v.getUint16(0) === 0x4749 && v.getUint8(2) === 0x46) {
        blocked = v.getUint16(6, true) > maxDim || v.getUint16(8, true) > maxDim;
      }
      return blocked ? null : URL.createObjectURL(file);
    }).catch(() => null);
  }, []);

  const startUpload = useCallback(async (id, file, channelId) => {
    const extras = {};
    if ((file.type || '').toLowerCase().startsWith('audio/')) {
      const wf = await computeWaveform(file).catch(() => '');
      if (wf) extras.waveform = wf;
    }
    try {
      const att = await uploadFile(file, channelId, (pct) => {
        setPendingFiles(prev => prev.map(pf => pf.id === id ? { ...pf, percent: pct } : pf));
      }, false, extras);
      setPendingFiles(prev => prev.map(pf => pf.id === id ? { ...pf, status: 'done', attId: att.id, percent: 100 } : pf));
    } catch (err) {
      setPendingFiles(prev => prev.map(pf => pf.id === id ? { ...pf, status: 'failed', error: err?.message || t('messages.input_warn_upload_failed') } : pf));
      showWarning(err?.message || t('messages.input_warn_upload_failed'), 'error');
    }
  }, [showWarning, t]);

  const addFiles = useCallback((files) => {
    if (!channel?.id) return;
    const channelId = channel.id;
    setPendingFiles(prev => {
      const visible = prev.filter(pf => pf.channelId === channelId);
      const room = MAX_FILE_COUNT - visible.length;
      if (room <= 0) {
        showWarning(t('messages.input_warn_max_files_template').replace('{max}', MAX_FILE_COUNT), 'error');
        return prev;
      }
      const valid = files.filter(f => {
        if (f.size > MAX_FILE_SIZE) {
          showWarning(t('messages.input_warn_file_too_large_template').replace('{name}', f.name).replace('{mb}', MAX_FILE_SIZE / (1024 * 1024)), 'error');
          return false;
        }
        return true;
      }).slice(0, room);
      if (valid.length === 0) return prev;
      const newEntries = valid.map(f => ({
        file: f,
        id: Date.now() + '_' + Math.random().toString(36).slice(2),
        thumbUrl: null,
        status: 'uploading',
        percent: 0,
        attId: null,
        error: null,
        channelId,
      }));
      valid.forEach((f, i) => {
        makeSafeThumb(f).then(url => {
          if (url) setPendingFiles(p => p.map(pf => pf.file === f ? { ...pf, thumbUrl: url } : pf));
        });
        startUpload(newEntries[i].id, f, channelId);
      });
      return [...prev, ...newEntries];
    });
  }, [channel?.id, makeSafeThumb, showWarning, t, startUpload]);

  const removeFile = useCallback((id) => {
    setPendingFiles(prev => {
      const entry = prev.find(p => p.id === id);
      if (entry?.thumbUrl) URL.revokeObjectURL(entry.thumbUrl);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  useEffect(() => {
    const off = on('dropFiles', (data) => {
      if (!data || !Array.isArray(data.files) || data.files.length === 0) return;
      if (channel?.id && data.channelId && data.channelId !== channel.id) return;
      addFiles(data.files);
    });
    return off;
  }, [channel?.id, addFiles]);

  useEffect(() => {
    return () => pendingFiles.forEach(p => { if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl); });
  }, []);
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const isTyping = useRef(false);
  const idleTimer = useRef(null);
  const keepalive = useRef(null);

  const sendStart = useCallback(() => {
    if (!channel) return;
    window.__wsSend?.({ type: 'typing_start', payload: { channel_id: channel.id } });
  }, [channel]);

  const sendStop = useCallback(() => {
    if (!channel || !isTyping.current) return;
    isTyping.current = false;
    clearTimeout(idleTimer.current);
    clearInterval(keepalive.current);
    window.__wsSend?.({ type: 'typing_stop', payload: { channel_id: channel.id } });
  }, [channel]);

  useEffect(() => () => { clearTimeout(idleTimer.current); clearInterval(keepalive.current); }, [channel]);

  useEffect(() => {
    const handler = (e) => { setReplyTo(e.detail); inputRef.current?.focus(); };
    window.addEventListener('replyToMessage', handler);
    return () => window.removeEventListener('replyToMessage', handler);
  }, []);

  const onType = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      sendStart();
      keepalive.current = setInterval(sendStart, 4000);
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(sendStop, 3000);
  }, [sendStart, sendStop]);

  // DM channels are permission-free: no guild, no role, can always send.
  // Guild channels require guildMe to compute effective perms.
  const isDM = !!channel?._dm;
  const dmPeerId = isDM ? channel._peerInfo?.peer_id : null;
  const dmPeerUsername = isDM ? channel._peerInfo?.peer_username : null;
  const { isBlocked, isBlockedBy, unblock: unblockUser } = useBlocks();
  const blockedByMe = isDM && dmPeerId ? isBlocked(dmPeerId) : false;
  const blockedByPeer = isDM && dmPeerId ? isBlockedBy(dmPeerId) : false;
  const allowed = isDM ? !(blockedByMe || blockedByPeer) : canSendInChannel(guildMe, channel, categories);
  const canAttach = isDM ? true : canAttachInChannel(guildMe, channel, categories);
  const channelPerms = isDM ? -1 : resolveChannelPerms(guildMe, channel, categories);
  const slowmodeSeconds = (!isDM && channel?.slowmode_seconds) || 0;
  const slowmodeImmune = !isDM && (hasPerm(channelPerms, PERM_MANAGE_CHANNELS) || hasPerm(channelPerms, PERM_MANAGE_MESSAGES));
  const slowmodeActive = slowmodeSeconds > 0 && !slowmodeImmune;
  const slashAC = useSlashCommands(input, setInput, inputRef, guildId, channel?.id);
  const history = useTextHistory(input, setInput, inputRef);
  useGlobalComposerFocus({ inputRef, value: input, onChange: setInput, active: allowed && !slashAC.inArgMode && !voiceMode });

  const sendingRef = useRef(false);
  const handleSubmit = (content) => {
    if (slashAC.inArgMode) {
      if (!slashAC.submit()) {
        showWarning(t('messages.input_warn_required_args'), 'warn');
      }
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setTimeout(() => { sendingRef.current = false; }, 0);
    const safeContent = content || '';
    const channelFiles = pendingFiles.filter(pf => pf.channelId === channel?.id);
    const doneFiles = channelFiles.filter(pf => pf.status === 'done' && pf.attId);
    const stillUploading = channelFiles.some(pf => pf.status !== 'done' && pf.status !== 'failed');
    if (stillUploading || disabled || !allowed) return;
    if (!safeContent && doneFiles.length === 0) return;
    if (slowmodeActive && Date.now() < slowmodeUntil) return;
    sendStop();
    if (doneFiles.length > 0) {
      const ids = doneFiles.map(pf => pf.attId);
      window.__wsSend?.({
        type: 'message_send',
        payload: {
          channel_id: channel.id,
          content: safeContent,
          attachment_ids: ids,
          reply_to: replyTo?.id || '',
        },
      });
      const firedIds = new Set(doneFiles.map(pf => pf.id));
      doneFiles.forEach(pf => { if (pf.thumbUrl) URL.revokeObjectURL(pf.thumbUrl); });
      setPendingFiles(prev => prev.filter(pf => !firedIds.has(pf.id)));
    } else {
      onSend(safeContent, replyTo);
    }
    setInput('');
    clearDraft(channel?.id);
    if (slowmodeActive) {
      setSlowmodeUntil(Date.now() + slowmodeSeconds * 1000);
    }
    setReplyTo(null);
    inputRef.current?.focus();
  };

  if (!allowed) {
    let message;
    if (blockedByMe) message = t('messages.input_blocked_by_me');
    else if (blockedByPeer) message = t('messages.input_blocked_by_peer');
    else message = t('messages.input_no_permission');
    const action = blockedByMe && dmPeerUsername ? (
      <button
        onClick={() => { unblockUser(dmPeerUsername).catch(() => {}); }}
        className="px-3 py-1 rounded-md text-[12px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white/70 transition-colors"
      >
        {t('user.profile_modal.unblock')}
      </button>
    ) : null;
    return <InputStateBar variant="locked" message={message} action={action} />;
  }
  if (slowmodeActive && slowmodeUntil > Date.now()) {
    return <InputStateBar variant="slowmode" message={t('messages.input_slowmode_active')} countdownUntilUnix={slowmodeUntil / 1000} />;
  }
  return (
    <div className="px-2 sm:px-4 pb-3 sm:pb-4 pt-1 flex-shrink-0 relative overflow-x-clip">
      <WarningBar warning={warning} onDismiss={() => setWarning(null)} />
      {replyTo && (
        <div className="flex items-center gap-2 bg-[var(--bg-float)] border border-white/[0.06] border-b-0 rounded-t-lg px-3 py-1.5">
          <svg className="w-4 h-4 text-white/20 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v3m-5-3l5 5m-5-5l5-5" /></svg>
          <p className="text-[11px] text-white/40 flex-1 min-w-0 truncate">{t('messages.input_replying_to_prefix')}<span className="text-white/60 font-medium">{resolveDisplayName(replyTo)}</span></p>
          <Tooltip text={t('messages.input_cancel_reply')}>
            <button onClick={() => setReplyTo(null)} aria-label={t('messages.input_cancel_reply')} className="text-white/20 hover:text-white/50 p-1 flex-shrink-0">
              <CloseIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      )}
      {(() => {
        const channelFiles = pendingFiles.filter(pf => pf.channelId === channel?.id);
        if (channelFiles.length === 0) return null;
        const total = channelFiles.length;
        const doneCount = channelFiles.filter(pf => pf.status === 'done').length;
        const failedCount = channelFiles.filter(pf => pf.status === 'failed').length;
        const isUploading = doneCount + failedCount < total;
        const sumPct = channelFiles.reduce((acc, pf) => acc + (pf.status === 'done' ? 100 : pf.status === 'failed' ? 0 : (pf.percent || 0)), 0);
        const overall = Math.round(sumPct / total);
        const currentNum = Math.min(doneCount + 1, total);
        return (
          <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-t-lg px-3 py-2.5 mb-[-1px]">
            {isUploading && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/55 font-medium">
                    {total > 1
                      ? t('messages.input_uploading_progress_template').replace('{current}', currentNum).replace('{total}', total)
                      : t('messages.input_uploading')}
                  </span>
                  <span className="text-[11px] text-white/40 tabular-nums">{overall}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full transition-[width] duration-200 ease-out"
                    style={{ width: overall + '%' }}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {channelFiles.map((pf) => (
                <div key={pf.id} className="relative group/file flex items-center gap-2 bg-white/[0.04] rounded-lg px-2.5 py-2 min-w-0 max-w-[200px]">
                  {pf.file.type?.startsWith('image/') && pf.thumbUrl ? (
                    <img src={pf.thumbUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <DocumentIcon className="w-4 h-4 text-white/25" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/50 truncate leading-tight">{pf.file.name}</p>
                    <p className="text-[10px] text-white/20 leading-tight">
                      {pf.status === 'failed' ? <span className="text-red-400/80">{t('messages.input_warn_upload_failed')}</span> : formatSize(pf.file.size)}
                    </p>
                  </div>
                  <Tooltip text={t('messages.input_remove_file')}>
                    <button onClick={() => removeFile(pf.id)} aria-label={t('messages.input_remove_file')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--bg-tertiary)] border border-white/[0.1] rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-red-500/20 opacity-0 group-hover/file:opacity-100 transition-all">
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
            {total > 1 && (
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04]">
                <span className="text-[10px] text-white/20">{t('messages.input_files_count_template').replace('{current}', total).replace('{max}', MAX_FILE_COUNT)}</span>
                <button onClick={() => {
                  channelFiles.forEach(p => { if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl); });
                  const ids = new Set(channelFiles.map(p => p.id));
                  setPendingFiles(prev => prev.filter(p => !ids.has(p.id)));
                }} className="text-[10px] text-white/25 hover:text-red-400/60 transition-colors">{t('developers.oauth2_clear_all')}</button>
              </div>
            )}
          </div>
        );
      })()}
      {voiceSending && (
        <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-t-lg px-3 py-2.5 mb-[-1px]">
          <span className="text-[11px] text-white/55 font-medium">{t('messages.input_uploading')}</span>
        </div>
      )}
      <div className={`relative flex items-center gap-1 sm:gap-2 bg-[var(--bg-float)] border border-white/[0.06] px-1 focus-within:border-white/[0.12] transition-colors ${replyTo || pendingFiles.length > 0 || voiceSending ? 'rounded-b-lg' : 'rounded-lg'}`}>
        {canAttach && !voiceMode && (
          <>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }} />
            <button
              ref={attachBtnRef}
              type="button"
              onClick={() => setAttachOpen(o => !o)}
              aria-label={t('messages.input_attach_file')}
              aria-expanded={attachOpen}
              className={`p-2 transition-all flex-shrink-0 ${pendingFiles.length > 0 ? 'text-blue-400' : 'text-white/20 hover:text-white/40'} ${attachOpen ? 'rotate-45' : ''}`}
              disabled={voiceSending}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            {attachOpen && (
              <AttachMenu
                anchorRef={attachBtnRef}
                onUpload={() => fileRef.current?.click()}
                onVoice={() => setVoiceMode(true)}
                onGif={isMobile ? () => setGifOpen(true) : undefined}
                onClose={() => setAttachOpen(false)}
              />
            )}
          </>
        )}
        {gifOpen && (
          <GifPicker
            anchorRef={gifBtnRef}
            onPick={({ url }) => {
              onSend(url, replyTo);
              setReplyTo(null);
              setGifOpen(false);
            }}
            onClose={() => setGifOpen(false)}
          />
        )}
        {voiceMode ? (
          <div className="flex-1 min-w-0 py-1 pr-1">
            <VoiceComposer onSend={sendVoiceMessage} onCancel={() => setVoiceMode(false)} disabled={voiceSending} />
          </div>
        ) : slashAC.inArgMode ? (
          <div className="flex-1 min-w-0">
            <SlashArgChips
              cmd={slashAC.activeCmd}
              args={slashAC.args}
              setArg={slashAC.setArg}
              onCancel={slashAC.cancel}
              onSubmit={slashAC.submit}
            />
          </div>
        ) : (
          <RichTextComposer
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            inputRef={inputRef}
            channel={channel}
            channels={channels}
            guildId={guildId}
            user={user}
            channelPerms={channelPerms}
            slashAC={slashAC}
            onUndoKeyDown={history.handleKeyDown}
            placeholder={channel?._dm
              ? t('messages.input_placeholder_dm_template').replace('{name}', channelName || '')
              : t('messages.input_placeholder_channel_template').replace('{name}', channelName || '')}
            maxLength={MAX_MESSAGE_LENGTH}
            onTextActivity={onType}
            onPaste={(e) => {
              if (!canAttach) return;
              const items = e.clipboardData?.items;
              if (!items) return;
              const files = [];
              for (const item of items) {
                if (item.type.startsWith('image/')) {
                  const file = item.getAsFile();
                  if (file) files.push(file);
                }
              }
              if (files.length > 0) {
                e.preventDefault();
                addFiles(files);
              }
            }}
          />
        )}
        {!voiceMode && (
          <div className="hidden sm:block">
            <Tooltip text="GIF">
              <button
                ref={gifBtnRef}
                type="button"
                onClick={() => setGifOpen(o => !o)}
                aria-label="GIF"
                aria-expanded={gifOpen}
                className={`px-2 py-2 text-[11px] font-bold tracking-wider transition-colors flex-shrink-0 ${gifOpen ? 'text-[var(--accent)]' : 'text-white/20 hover:text-white/50'}`}
                disabled={voiceSending}
              >
                GIF
              </button>
            </Tooltip>
          </div>
        )}
        {!slashAC.inArgMode && !voiceMode && <CharCount length={input.length} />}
        {!voiceMode && slowmodeSeconds > 0 && !isDM && (
          <SlowmodeHint seconds={slowmodeSeconds} immune={slowmodeImmune} compact />
        )}
        {!voiceMode && (
          <button
            onClick={() => handleSubmit(input)}
            disabled={
              slashAC.inArgMode
                ? ((slashAC.activeCmd?.options || []).some(o => o.required && (slashAC.args[o.name] === undefined || slashAC.args[o.name] === '')) || disabled || voiceSending)
                : ((!input.trim() && pendingFiles.length === 0) || disabled || voiceSending || pendingFiles.some(pf => pf.status === 'failed'))
            }
            className="sm:hidden px-2.5 py-1.5 my-1 mr-0.5 rounded-md text-[12px] font-medium flex-shrink-0 transition-colors bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:bg-[rgb(var(--accent-rgb)/0.3)] disabled:text-white/30"
          >
            {t('messages.input_btn_send')}
          </button>
        )}
      </div>
    </div>
  );
}