export function bannerCropStyle(crop) {
  const c = typeof crop === 'string' ? (() => { try { return JSON.parse(crop); } catch { return null; } })() : crop;
  const s = { objectFit: 'cover', objectPosition: `${c?.x ?? 50}% ${c?.y ?? 50}%` };
  if (c?.zoom > 1) { s.transform = `scale(${c.zoom})`; s.transformOrigin = `${c.x ?? 50}% ${c.y ?? 50}%`; }
  return s;
}