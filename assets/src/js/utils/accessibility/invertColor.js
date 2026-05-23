import { parseColor, emitColor, parseTriplet, emitTriplet, hslToRgb, rgbToHsl } from './_colorMath';

export function invertColor(value, opts) {
  if (value == null) return value;
  const v = String(value).trim();
  if (v === '') return value;
  if (opts && opts.isTriplet) {
    const t = parseTriplet(v);
    if (!t) return value;
    const [h, s, l] = rgbToHsl(t.r, t.g, t.b);
    const [nr, ng, nb] = hslToRgb(h, s, 100 - l);
    return emitTriplet(nr, ng, nb);
  }
  const parsed = parseColor(v);
  if (!parsed) return value;
  return emitColor(parsed, parsed.h, parsed.s, 100 - parsed.l);
}