import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon, DownloadIcon, VolumeMuteIcon, VolumeLowIcon, VolumeHighIcon, FullscreenEnterIcon, FullscreenExitIcon, VideoOffIcon } from '../icons';
import useMediaPlayer, { formatMediaTime } from '../../hooks/useMediaPlayer';
import { useT } from '../../hooks/useT';
import Tooltip from '../ui/Tooltip';
import Slider from '../ui/Slider';

export default function VideoPlayer({ src, filename }) {
  const t = useT();
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const [inView, setInView] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const mp = useMediaPlayer(videoRef, progressRef, { ready: inView, retries: 2 });

  const showControls = !mp.playing || hovered;

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      window.dispatchEvent(new Event('scrollSave'));
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFSChange = () => {
      const isFS = !!document.fullscreenElement;
      setFullscreen(isFS);
      if (!isFS) window.dispatchEvent(new Event('scrollRestore'));
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const onMouseMove = () => {
    setHovered(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(false), 2500);
  };

  return (
    <div
      ref={(el) => { containerRef.current = el; sentinelRef.current = el; }}
      className={`relative group rounded-lg overflow-hidden bg-black w-full sm:w-auto max-w-full sm:max-w-md ${fullscreen ? 'w-full h-full max-w-none' : ''}`}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHovered(false)}
    >
      {mp.error ? (
        <div className="flex items-center justify-center bg-white/[0.02] rounded-lg py-8 px-4">
          <div className="text-center">
            <VideoOffIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-[11px] text-white/30 font-medium">{t('media.video_unavailable')}</p>
            {filename && <p className="text-[10px] text-white/15 mt-0.5 truncate max-w-[200px]">{filename}</p>}
          </div>
        </div>
      ) : (
        <>
          {inView ? (
            <video
              ref={videoRef}
              src={src}
              className={`w-full ${fullscreen ? 'h-full object-contain' : 'max-h-72'} cursor-pointer`}
              onClick={mp.togglePlay}
              preload="metadata"
              playsInline
            />
          ) : (
            <div className="w-full max-h-72 min-h-[120px] bg-white/[0.02]" />
          )}

          {!mp.playing && mp.currentTime === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <PlayIcon className="w-7 h-7 text-white ml-1" />
              </div>
            </div>
          )}
        </>
      )}

      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2 px-3 transition-opacity duration-200 ${mp.error ? 'hidden' : showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div
          ref={progressRef}
          className="w-full relative cursor-pointer mb-2 group/bar"
          style={{ height: '16px', display: 'flex', alignItems: 'center' }}
          onMouseDown={mp.onBarDown}
          onMouseMove={mp.onBarHover}
          onMouseLeave={mp.onBarLeave}
        >
          <div className="w-full h-[3px] group-hover/bar:h-1.5 bg-white/20 rounded-full relative transition-all duration-150">
            {mp.hoverPct !== null && (
              <div className="absolute h-full bg-white/10 rounded-full" style={{ width: (mp.hoverPct * 100) + '%' }} />
            )}
            <div className="h-full bg-[var(--media-accent)] rounded-full transition-[width] duration-75" style={{ width: mp.progress + '%' }} />
          </div>
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 group-hover/bar:w-4 group-hover/bar:h-4 bg-[var(--media-accent)] rounded-full shadow-lg transition-all duration-150 ${mp.seeking || mp.hoverPct !== null ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover/bar:opacity-100 group-hover/bar:scale-100'}`}
            style={{ left: mp.progress + '%', boxShadow: '0 0 8px rgb(var(--media-accent-rgb) / 0.35)' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={mp.togglePlay} className="text-white/80 hover:text-white transition-colors">
            {mp.playing ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          </button>

          <span className="text-[11px] text-white/60 font-mono tabular-nums min-w-[70px]">
            {formatMediaTime(mp.currentTime)} / {formatMediaTime(mp.duration)}
          </span>

          <div className="relative flex items-center ml-auto" onMouseEnter={() => mp.setShowVolume(true)} onMouseLeave={() => mp.setShowVolume(false)}>
            <button onClick={mp.toggleMute} className="text-white/60 hover:text-white transition-colors">
              {mp.muted || mp.volume === 0 ? (
                <VolumeMuteIcon className="w-4 h-4" />
              ) : mp.volume < 0.5 ? (
                <VolumeLowIcon className="w-4 h-4" />
              ) : (
                <VolumeHighIcon className="w-4 h-4" />
              )}
            </button>
            {mp.showVolume && (
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={mp.muted ? 0 : mp.volume}
                onChange={(v) => mp.onVolumeChange({ target: { value: v } })}
                trackClassName="w-16 ml-1 bg-white/20"
                thumbClassName="[&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5"
              />
            )}
          </div>

          <Tooltip text={t('media.download')}>
            <a href={src} download={filename || true} aria-label={t('media.download')} className="text-white/60 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
              <DownloadIcon className="w-4 h-4" />
            </a>
          </Tooltip>

          <button onClick={toggleFullscreen} className="text-white/60 hover:text-white transition-colors">
            {fullscreen ? (
              <FullscreenExitIcon className="w-4 h-4" />
            ) : (
              <FullscreenEnterIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {filename && !mp.playing && mp.currentTime === 0 && !mp.error && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-0.5">
          <span className="text-[10px] text-white/60 truncate max-w-[150px] block">{filename}</span>
        </div>
      )}
    </div>
  );
}