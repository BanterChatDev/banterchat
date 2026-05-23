import { getTopRole } from '../hooks/usePermEvents';

export const NEUTRAL_NAME_COLOR = 'rgba(255,255,255,0.9)';
export const NEUTRAL_NAME_COLOR_DIM = 'rgba(255,255,255,0.55)';
export const NEUTRAL_MENTION_COLOR = 'rgba(255,255,255,0.6)';
export const NEUTRAL_INVOKER_COLOR = 'rgba(255,255,255,0.5)';

export function resolveNameColor({ source, guildMe, isDM, fallback = NEUTRAL_NAME_COLOR }) {
  if (isDM) return fallback;
  if (source) {
    if (source.role_color) return source.role_color;
    if (source.roles && source.roles.length > 0 && source.roles[0].color) return source.roles[0].color;
  }
  if (guildMe) {
    const top = getTopRole(guildMe.roles);
    if (top && top.color) return top.color;
  }
  return fallback;
}

export function resolveOptimisticNameColor({ guildMe, isDM }) {
  if (isDM) return undefined;
  const top = getTopRole(guildMe && guildMe.roles);
  return top ? top.color : undefined;
}