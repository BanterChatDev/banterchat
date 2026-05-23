import { useRef, useState, useCallback, useEffect } from 'react';

const VOICE_MIME_CANDIDATES = [
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const m of VOICE_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function useVoiceRecorder({ maxMs = 5 * 60 * 1000 } = {}) {
  const [state, setState] = useState('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef(0);
  const mimeRef = useRef('');

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = 0;
    }
  }, []);

  useEffect(() => () => stopTracks(), [stopTracks]);

  const start = useCallback(async () => {
    setError('');
    setBlob(null);
    setElapsedMs(0);
    const mime = pickMime();
    if (!mime) { setError('recorder_unsupported'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mimeRef.current = mime;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const out = new Blob(chunksRef.current, { type: mime });
        setBlob(out);
        setState('preview');
        stopTracks();
      };
      recorderRef.current = rec;
      rec.start();
      startedAtRef.current = Date.now();
      tickRef.current = setInterval(() => {
        const e = Date.now() - startedAtRef.current;
        setElapsedMs(e);
        if (e >= maxMs && rec.state === 'recording') rec.stop();
      }, 100);
      setState('recording');
    } catch {
      setError('recorder_denied');
      stopTracks();
      setState('idle');
    }
  }, [maxMs, stopTracks]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') rec.stop();
  }, []);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.onstop = () => {};
      rec.stop();
    }
    stopTracks();
    chunksRef.current = [];
    setBlob(null);
    setElapsedMs(0);
    setState('idle');
  }, [stopTracks]);

  const toFile = useCallback(() => {
    if (!blob) return null;
    const ext = mimeRef.current.includes('ogg') ? 'ogg' : mimeRef.current.includes('mp4') ? 'm4a' : 'webm';
    return new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeRef.current });
  }, [blob]);

  return { state, elapsedMs, blob, error, start, stop, cancel, toFile };
}