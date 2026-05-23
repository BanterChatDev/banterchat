import { emit, on } from './eventBus';

let until = 0;
let expireTimer = null;

function armExpire() {
  if (expireTimer) clearTimeout(expireTimer);
  const ms = until - Date.now();
  if (ms <= 0) return;
  expireTimer = setTimeout(() => {
    expireTimer = null;
    emit('rateLimitChange', { active: false, msRemaining: 0 });
  }, ms);
}

export function noteRateLimited(retryAfterSeconds) {
  const ms = Math.max(0, Math.ceil((retryAfterSeconds || 0) * 1000));
  const candidate = Date.now() + ms;
  if (candidate > until) until = candidate;
  armExpire();
  emit('rateLimitChange', { active: isLimited(), msRemaining: msRemaining() });
}

export function isLimited() {
  return Date.now() < until;
}

export function msRemaining() {
  return Math.max(0, until - Date.now());
}

export function onRateLimitChange(fn) {
  return on('rateLimitChange', fn);
}