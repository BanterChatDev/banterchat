import { parseColor, emitColor, parseTriplet, emitTriplet, hslToRgb, rgbToHsl } from './_colorMath';

export function boostContrast(value, opts) {
  if (value == null) return value;
  const v = String(value).trim();
  if (v === '') return value;
  const towardLight = !(opts && opts.darkText);
  const amount = (opts && typeof opts.amount === 'number') ? opts.amount : 0.5;
  const target = towardLight ? 100 : 0;
  if (opts && opts.isTriplet) {
    const t = parseTriplet(v);
    if (!t) return value;
    const [h, s, l] = rgbToHsl(t.r, t.g, t.b);
    const newL = l + (target - l) * amount;
    const [nr, ng, nb] = hslToRgb(h, s, newL);
    return emitTriplet(nr, ng, nb);
  }
  const parsed = parseColor(v);
  if (!parsed) return value;
  const newL = parsed.l + (target - parsed.l) * amount;
  if (parsed.a !== null && parsed.a < 1 && parsed.a > 0) {
    parsed.a = Math.min(1, parsed.a + (1 - parsed.a) * amount * 0.6);
  }
  return emitColor(parsed, parsed.h, parsed.s, newL);
}