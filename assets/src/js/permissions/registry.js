const registry = [];
let permAll = 0n;

export function toBig(v) {
  if (typeof v === 'bigint') return v;
  if (v == null) return 0n;
  if (typeof v === 'number') return BigInt(Math.trunc(v));
  if (typeof v === 'string' && v !== '') return BigInt(v);
  return 0n;
}

export function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  return 0;
}

export function registerPerm(key, bit, label, desc, { channelLevel = false, voiceOnly = false } = {}) {
  const big = toBig(bit);
  registry.push({ key, bit: big, label, desc, channelLevel, voiceOnly });
  permAll |= big;
  return big;
}

export function getAllPermissions() { return registry; }
export function getChannelPermissions(channelType) {
  const all = registry.filter(p => p.channelLevel);
  if (channelType === 'voice') return all;
  if (channelType === 'text') return all.filter(p => !p.voiceOnly);
  return all;
}
export function getPermAll() { return permAll; }