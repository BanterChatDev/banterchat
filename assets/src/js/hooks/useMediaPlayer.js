import { useState, useRef, useCallback, useEffect } from 'react';
import { useUIPrefs } from './useUIPrefs';

export function formatMediaTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

export default function useMediaPlayer(mediaRef, progressRef, { ready = true, retries = 0 } = {}) {
  const { prefs, setPref } = useUIPrefs();
  const initialVolume = typeof prefs.mediaVolume === 'number' ? prefs.mediaVolume : 1;
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialVolume);
  const [muted, setMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [error, setError] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekPct, setSeekPct] = useState(null);
  const [hoverPct, setHoverPct] = useState(null);
  const seekingRef = useRef(false);
  const retryCount = useRef(0);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el || error) return;
    if (el.paused) { el.play().catch(() => setError(true)); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  }, [error]);

  const toggleMute = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  const onVolumeChange = useCallback((e) => {
    const el = mediaRef.current;
    if (!el) return;
    const val = parseFloat(e.target.value);
    el.volume = val;
    setVolume(val);
    if (val === 0) { el.muted = true; setMuted(true); }
    else if (el.muted) { el.muted = false; setMuted(false); }
    setPref('mediaVolume', val);
  }, [setPref]);

  const getPct = useCallback((e) => {
    const bar = progressRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const commitSeek = useCallback((pct) => {
    const el = mediaRef.current;
    if (!el) return;
    if (!el.duration) {
      el.load();
      return;
    }
    el.currentTime = pct * el.duration;
  }, []);

  const onBarDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    seekingRef.current = true;
    setSeeking(true);
    const pct = getPct(e);
    setSeekPct(pct);
    commitSeek(pct);

    const onMove = (ev) => {
      const p = getPct(ev);
      setSeekPct(p);
      commitSeek(p);
    };
    const onUp = (ev) => {
      const finalPct = getPct(ev);
      commitSeek(finalPct);
      seekingRef.current = false;
      setSeeking(false);
      setSeekPct(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [getPct, commitSeek]);

  const onBarHover = useCallback((e) => setHoverPct(getPct(e)), [getPct]);
  const onBarLeave = useCallback(() => setHoverPct(null), []);

  useEffect(() => {
    if (!ready) return;
    const el = mediaRef.current;
    if (!el) return;
    el.volume = initialVolume;
    const onTime = () => {
      if (!seekingRef.current) setCurrentTime(el.currentTime);
    };
    const onSeeked = () => {
      setCurrentTime(el.currentTime);
      if (!seekingRef.current) setSeekPct(null);
    };
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    const onErr = () => {
      if (retryCount.current < retries) {
        retryCount.current++;
        el.load();
      } else {
        setError(true);
      }
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    el.addEventListener('error', onErr);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('error', onErr);
    };
  }, [ready, retries]);

  const progress = seekPct !== null ? seekPct * 100 : duration ? (currentTime / duration) * 100 : 0;

  return {
    playing, currentTime, duration, volume, muted, showVolume, error,
    seeking, hoverPct, progress,
    setShowVolume,
    togglePlay, toggleMute, onVolumeChange,
    onBarDown, onBarHover, onBarLeave,
  };
}