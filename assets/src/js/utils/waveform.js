const WAVEFORM_BUCKETS = 64;
const WAVEFORM_BYTE_MAX = 127;

export async function computeWaveform(blob) {
  if (!blob) return '';
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return '';
  const buf = await blob.arrayBuffer();
  const ctx = new Ctx();
  let audio;
  try {
    audio = await new Promise((resolve, reject) => {
      const slice = buf.slice(0);
      const r = ctx.decodeAudioData(slice, resolve, reject);
      if (r && typeof r.then === 'function') r.then(resolve, reject);
    });
  } catch {
    try { await ctx.close(); } catch {}
    return '';
  }
  const channels = audio.numberOfChannels;
  const length = audio.length;
  if (length === 0 || channels === 0) {
    try { await ctx.close(); } catch {}
    return '';
  }
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = audio.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  if (channels > 1) {
    for (let i = 0; i < length; i++) mono[i] /= channels;
  }
  try { await ctx.close(); } catch {}
  const samplesPerBucket = Math.max(1, Math.floor(length / WAVEFORM_BUCKETS));
  const bytes = new Uint8Array(WAVEFORM_BUCKETS);
  let peak = 0;
  const rmsBuckets = new Float32Array(WAVEFORM_BUCKETS);
  for (let b = 0; b < WAVEFORM_BUCKETS; b++) {
    const start = b * samplesPerBucket;
    const end = b === WAVEFORM_BUCKETS - 1 ? length : start + samplesPerBucket;
    let sum = 0;
    let n = 0;
    for (let i = start; i < end; i++) {
      const v = mono[i];
      sum += v * v;
      n++;
    }
    const rms = n > 0 ? Math.sqrt(sum / n) : 0;
    rmsBuckets[b] = rms;
    if (rms > peak) peak = rms;
  }
  const norm = peak > 0 ? peak : 1;
  for (let b = 0; b < WAVEFORM_BUCKETS; b++) {
    const v = rmsBuckets[b] / norm;
    bytes[b] = Math.max(0, Math.min(WAVEFORM_BYTE_MAX, Math.round(v * WAVEFORM_BYTE_MAX)));
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodeWaveform(b64) {
  if (!b64) return null;
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}