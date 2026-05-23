import React, { useEffect, useRef, useState } from 'react';
import { MicOnIcon, CloseIcon, PlayIcon, PauseIcon, CheckIcon, TrashIcon } from '../icons';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useT } from '../../hooks/useT';

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceComposer({ onSend, onCancel, disabled }) {
  const t = useT();
  const rec = useVoiceRecorder();
  const [previewUrl, setPreviewUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (rec.state === 'idle' && !rec.blob) rec.start();
  }, []);

  useEffect(() => {
    if (!rec.blob) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(rec.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [rec.blob]);

  const handleSend = () => {
    if (!rec.blob) return;
    onSend(rec.toFile(), rec.elapsedMs, rec.blob);
  };

  const cancelAll = () => {
    rec.cancel();
    onCancel();
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };

  if (rec.error) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-float)] border border-red-500/30 rounded-md min-w-0">
        <span className="text-[12px] text-red-400/90 flex-1 truncate min-w-0">{t(`messages.voice_error_${rec.error}`)}</span>
        <button onClick={cancelAll} className="p-1 text-white/40 hover:text-white/70 transition-colors flex-shrink-0" aria-label={t('common.cancel')}>
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (rec.state === 'recording') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-float)] border border-white/[0.08] rounded-md min-w-0">
        <span className="relative flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
          <span className="relative block w-2 h-2 rounded-full bg-red-500" />
        </span>
        <span className="text-[12px] text-white/85 font-mono tabular-nums flex-1 min-w-0">{formatTime(rec.elapsedMs)}</span>
        <button onClick={cancelAll} className="p-1.5 text-white/45 hover:text-red-400 transition-colors flex-shrink-0" aria-label={t('common.cancel')}>
          <TrashIcon className="w-4 h-4" />
        </button>
        <button onClick={rec.stop} aria-label={t('messages.voice_stop')} className="p-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors flex-shrink-0">
          <CheckIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (rec.state === 'preview' && previewUrl) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-float)] border border-white/[0.08] rounded-md min-w-0">
        <button onClick={togglePlay} className="p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white/85 transition-colors flex-shrink-0" aria-label={playing ? t('messages.voice_pause') : t('messages.voice_play')}>
          {playing ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
        </button>
        <audio ref={audioRef} src={previewUrl} onEnded={() => setPlaying(false)} className="hidden" />
        <span className="text-[12px] text-white/85 font-mono tabular-nums flex-1 min-w-0">{formatTime(rec.elapsedMs)}</span>
        <button onClick={cancelAll} className="p-1.5 text-white/45 hover:text-red-400 transition-colors flex-shrink-0" aria-label={t('common.cancel')}>
          <TrashIcon className="w-4 h-4" />
        </button>
        <button onClick={handleSend} disabled={disabled} aria-label={t('messages.voice_send')} className="p-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors flex-shrink-0 disabled:opacity-50">
          <MicOnIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}