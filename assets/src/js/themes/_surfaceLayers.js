import { parseColor, emitColor } from '../utils/accessibility/_colorMath';

const TIERS = {
  bg_deepest:    { lightDelta: -10, alphaDelta: -0.10 },
  bg_tertiary:   { lightDelta:  -6, alphaDelta: -0.05 },
  bg_secondary:  { lightDelta:  -3, alphaDelta: -0.02 },
  bg_base:       { lightDelta:   0, alphaDelta:  0    },
  bg_float:      { lightDelta:  +4, alphaDelta: +0.05 },
  bg_popover:    { lightDelta:  -6, alphaDelta: +0.20 },
  bg_input:      { lightDelta:  -5, alphaDelta:  0    },
  user_card_bg:  { lightDelta:  -3, alphaDelta: +0.03 },
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function resolveSurfaceLayers(theme) {
  const vars = theme.vars || {};
  const seed = theme.surfaceSeed;
  if (!seed) return vars;
  const parsed = parseColor(seed.color);
  if (!parsed) return vars;
  const baseAlpha = (typeof seed.alpha === 'number') ? seed.alpha : 1;
  const next = { ...vars };
  for (const [key, delta] of Object.entries(TIERS)) {
    if (next[key] != null) continue;
    const newL = clamp(parsed.l + delta.lightDelta, 0, 100);
    const newA = clamp(baseAlpha + delta.alphaDelta, 0, 1);
    const stamp = { ...parsed, a: baseAlpha < 1 ? newA : null };
    next[key] = emitColor(stamp, parsed.h, parsed.s, newL);
  }
  return next;
}