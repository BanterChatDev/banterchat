export async function cropToAspect(file, crop, aspect = 1, targetLongEdge = 512) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const zoom = Math.max(1, crop?.zoom || 1);
    const focusX = (crop?.x ?? 50) / 100;
    const focusY = (crop?.y ?? 50) / 100;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let sourceW;
    let sourceH;
    if (imgAspect > aspect) {
      sourceH = img.naturalHeight / zoom;
      sourceW = sourceH * aspect;
    } else {
      sourceW = img.naturalWidth / zoom;
      sourceH = sourceW / aspect;
    }
    const maxSx = img.naturalWidth - sourceW;
    const maxSy = img.naturalHeight - sourceH;
    const sx = Math.max(0, Math.min(maxSx, focusX * img.naturalWidth - sourceW / 2));
    const sy = Math.max(0, Math.min(maxSy, focusY * img.naturalHeight - sourceH / 2));
    let outW;
    let outH;
    if (aspect >= 1) {
      outW = targetLongEdge;
      outH = Math.round(targetLongEdge / aspect);
    } else {
      outH = targetLongEdge;
      outW = Math.round(targetLongEdge * aspect);
    }
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sourceW, sourceH, 0, 0, outW, outH);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('crop failed');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function cropToSquare(file, crop, targetSize = 256) {
  return cropToAspect(file, crop, 1, targetSize);
}

export function isAnimatedMime(mime) {
  return mime === 'image/gif';
}

export async function isAnimatedFile(file) {
  if (!file || !file.type) return false;
  if (file.type === 'image/gif') return true;
  if (file.type !== 'image/webp') return false;
  try {
    const buf = await file.slice(0, 30).arrayBuffer();
    const v = new Uint8Array(buf);
    if (v.length < 30) return false;
    if (v[0] !== 0x52 || v[1] !== 0x49 || v[2] !== 0x46 || v[3] !== 0x46) return false;
    if (v[8] !== 0x57 || v[9] !== 0x45 || v[10] !== 0x42 || v[11] !== 0x50) return false;
    if (v[12] !== 0x56 || v[13] !== 0x50 || v[14] !== 0x38 || v[15] !== 0x58) return false;
    return (v[20] & 0x02) !== 0;
  } catch {
    return false;
  }
}