import React, { useRef, useMemo } from 'react';
import { PlayIcon, PauseIcon, DownloadIcon, VolumeMuteIcon, VolumeLowIcon, VolumeHighIcon } from '../icons';
import useMediaPlayer, { formatMediaTime } from '../../hooks/useMediaPlayer';
import { decodeWaveform } from '../../utils/waveform';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';
import Slider from '../ui/Slider';

function WaveformBackdrop({ samples, progress }) {
  const count = samples.length;
  const playedIdx = Math.floor((progress / 100) * count);
  const out = [];
  for (let i = 0; i < count; i++) {
    const v = samples[i] || 0;
    const h = Math.max(2, Math.round((v / 127) * 100));
    const played = i <= playedIdx;
    out.push(
      <span
        key={i}
        className={`inline-block w-[2px] mx-[0.5px] rounded-full transition-colors ${played ? 'bg-[var(--accent)]/55' : 'bg-white/15'}`}
        style={{ height: `${h}%` }}
      />
    );
  }
  return <div className="absolute inset-0 flex items-center pointer-events-none">{out}</div>;
}

export default function AudioPlayer({ src, filename, waveform, durationSecs }) {
  const t = useT();
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const mp = useMediaPlayer(audioRef, progressRef);

  const samples = useMemo(() => (waveform ? decodeWaveform(waveform) : null), [waveform]);
  const hasWaveform = !!(samples && samples.length > 0);
  const displayDuration = mp.duration || durationSecs || 0;

  return (
    <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-3 w-full sm:w-auto max-w-full sm:max-w-sm hover:bg-white/[0.05] transition-colors duration-200">
      <audio ref={audioRef} src={src} preload="metadata" />
      {mp.error ? (
        <>
          <svg className="w-5 h-5 text-white/15 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM21 16c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/30 font-medium">{t('media.audio_unavailable')}</p>
            {filename && <p className="text-[10px] text-white/15 truncate">{filename}</p>}
          </div>
        </>
      ) : (
        <>
          <button onClick={mp.togglePlay} className="text-white/70 hover:text-white transition-colors flex-shrink-0">
            {mp.playing ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          </button>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {filename && <span className="text-[10px] text-white/40 truncate">{filename}</span>}
            <div
              ref={progressRef}
              className="w-full relative cursor-pointer group/bar"
              style={{ height: hasWaveform ? '22px' : '14px', display: 'flex', alignItems: 'center' }}
              onMouseDown={mp.onBarDown}
              onMouseMove={mp.onBarHover}
              onMouseLeave={mp.onBarLeave}
            >
              {hasWaveform && <WaveformBackdrop samples={samples} progress={mp.progress} />}
              <div className={`w-full ${hasWaveform ? 'h-[2px]' : 'h-[3px] group-hover/bar:h-1.5'} bg-white/10 rounded-full relative transition-all duration-150`}>
                {mp.hoverPct !== null && (
                  <div className="absolute h-full bg-white/10 rounded-full" style={{ width: (mp.hoverPct * 100) + '%' }} />
                )}
                <div className="h-full bg-[var(--accent)]/70 rounded-full transition-all duration-150" style={{ width: mp.progress + '%' }} />
              </div>
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-opacity ${mp.seeking || mp.hoverPct !== null ? 'opacity-100' : 'opacity-0 group-hover/bar:opacity-100'}`}
                style={{ left: mp.progress + '%' }}
              />
            </div>
          </div>
          <span className="text-[10px] text-white/40 font-mono tabular-nums flex-shrink-0">
            {formatMediaTime(mp.currentTime)}/{formatMediaTime(displayDuration)}
          </span>
          <div className="relative flex items-center flex-shrink-0" onMouseEnter={() => mp.setShowVolume(true)} onMouseLeave={() => mp.setShowVolume(false)}>
            <button onClick={mp.toggleMute} className="text-white/40 hover:text-white/70 transition-colors">
              {mp.muted || mp.volume === 0 ? (
                <VolumeMuteIcon className="w-3.5 h-3.5" />
              ) : mp.volume < 0.5 ? (
                <VolumeLowIcon className="w-3.5 h-3.5" />
              ) : (
                <VolumeHighIcon className="w-3.5 h-3.5" />
              )}
            </button>
            {mp.showVolume && (
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={mp.muted ? 0 : mp.volume}
                onChange={(v) => mp.onVolumeChange({ target: { value: v } })}
                trackClassName="w-14 ml-1"
                thumbClassName="[&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:h-2"
              />
            )}
          </div>
          <Tooltip text={t('media.download')}>
            <a href={src} download={filename || true} aria-label={t('media.download')} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
              <DownloadIcon className="w-3.5 h-3.5" />
            </a>
          </Tooltip>
        </>
      )}
    </div>
  );
}