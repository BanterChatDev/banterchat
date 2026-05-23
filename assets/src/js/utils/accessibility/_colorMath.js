export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function parseColor(value) {
  if (value == null) return null;
  const v = String(value).trim();
  if (v === '') return null;
  if (v.startsWith('#')) {
    let h = v.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : null;
    const [hue, sat, light] = rgbToHsl(r, g, b);
    return { h: hue, s: sat, l: light, a: alpha, format: 'hex' };
  }
  const hslM = v.match(/^hsla?\s*\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+))?\s*\)$/i);
  if (hslM) {
    return {
      h: parseFloat(hslM[1]),
      s: parseFloat(hslM[2]),
      l: parseFloat(hslM[3]),
      a: hslM[4] !== undefined ? parseFloat(hslM[4]) : null,
      format: 'hsl',
    };
  }
  const rgbM = v.match(/^rgba?\s*\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i);
  if (rgbM) {
    const r = parseFloat(rgbM[1]);
    const g = parseFloat(rgbM[2]);
    const b = parseFloat(rgbM[3]);
    const [h, s, l] = rgbToHsl(r, g, b);
    return {
      h, s, l,
      a: rgbM[4] !== undefined ? parseFloat(rgbM[4]) : null,
      format: 'rgb',
    };
  }
  return null;
}

export function emitColor(parsed, h, s, l) {
  const a = parsed.a;
  if (parsed.format === 'hex') {
    const [r, g, b] = hslToRgb(h, s, l);
    const toHex = (n) => n.toString(16).padStart(2, '0');
    if (a !== null) return '#' + toHex(r) + toHex(g) + toHex(b) + toHex(Math.round(a * 255));
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }
  if (parsed.format === 'hsl') {
    if (a !== null) return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  const [r, g, b] = hslToRgb(h, s, l);
  if (a !== null) return `rgba(${r}, ${g}, ${b}, ${a})`;
  return `rgb(${r}, ${g}, ${b})`;
}

export function parseTriplet(value) {
  const parts = String(value).trim().split(/[\s,]+/);
  if (parts.length !== 3) return null;
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

export function emitTriplet(r, g, b) {
  return `${r} ${g} ${b}`;
}