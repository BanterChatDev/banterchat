import React, { useRef, useMemo } from 'react';
import { PlayIcon, PauseIcon, DownloadIcon } from '../icons';
import useMediaPlayer, { formatMediaTime } from '../../hooks/useMediaPlayer';
import { decodeWaveform } from '../../utils/waveform';
import Tooltip from '../ui/Tooltip';
import { useT } from '../../hooks/useT';

function oggDownloadName(filename) {
  const base = (filename || 'voice-message').replace(/\.[^.]+$/, '');
  return `${base}.ogg`;
}

function Bars({ samples, progress, hoverPct }) {
  const count = samples.length;
  const playedIdx = Math.floor((progress / 100) * count);
  const hoverIdx = hoverPct !== null ? Math.floor(hoverPct * count) : -1;
  const out = [];
  for (let i = 0; i < count; i++) {
    const v = samples[i] || 0;
    const h = Math.max(10, Math.round((v / 127) * 100));
    let cls;
    if (i <= playedIdx) cls = 'bg-[var(--accent)]';
    else if (hoverIdx >= 0 && i <= hoverIdx) cls = 'bg-white/55';
    else cls = 'bg-white/25';
    out.push(<span key={i} className={`inline-block w-[3px] mx-[1px] rounded-full transition-colors ${cls}`} style={{ height: `${h}%` }} />);
  }
  return out;
}

export default function VoicePlayer({ src, waveform, durationSecs, filename }) {
  const t = useT();
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const mp = useMediaPlayer(audioRef, progressRef);

  const samples = useMemo(() => decodeWaveform(waveform || ''), [waveform]);
  const total = mp.duration || durationSecs || 0;
  const elapsed = mp.playing || mp.currentTime > 0 ? mp.currentTime : total;

  if (!samples || samples.length === 0) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--bg-float)] border border-white/[0.06] rounded-2xl w-full sm:w-auto sm:inline-flex max-w-full sm:max-w-md">
        <span className="text-[11px] text-white/40">{t('voice.message_unavailable')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--bg-float)] border border-white/[0.06] rounded-2xl w-full sm:w-auto sm:inline-flex max-w-full sm:max-w-md">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={mp.togglePlay}
        aria-label={mp.playing ? t('voice.voice_pause') : t('voice.voice_play')}
        className="p-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors flex-shrink-0"
      >
        {mp.playing ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
      </button>
      <div
        ref={progressRef}
        className="flex-1 h-7 flex items-center cursor-pointer min-w-0 overflow-hidden"
        onMouseDown={mp.onBarDown}
        onMouseMove={mp.onBarHover}
        onMouseLeave={mp.onBarLeave}
      >
        <Bars samples={samples} progress={mp.progress} hoverPct={mp.hoverPct} />
      </div>
      <span className="text-[11px] text-white/55 font-mono tabular-nums flex-shrink-0">
        {formatMediaTime(elapsed)}
      </span>
      <Tooltip text={t('media.download')}>
        <a href={src} download={oggDownloadName(filename)} aria-label={t('media.download')} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
          <DownloadIcon className="w-3.5 h-3.5" />
        </a>
      </Tooltip>
    </div>
  );
}