import { registerResetHandler } from '../cache';

const PREFIX = 'draft:';
const MAX_LEN = 8000;

function key(channelId) {
  return PREFIX + channelId;
}

registerResetHandler(() => {
  try {
    const toDel = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toDel.push(k);
    }
    toDel.forEach(k => localStorage.removeItem(k));
  } catch {}
});

export function getDraft(channelId) {
  if (!channelId) return '';
  try {
    return localStorage.getItem(key(channelId)) || '';
  } catch {
    return '';
  }
}

export function setDraft(channelId, value) {
  if (!channelId) return;
  try {
    if (value && value.length > 0) {
      localStorage.setItem(key(channelId), value.slice(0, MAX_LEN));
    } else {
      localStorage.removeItem(key(channelId));
    }
  } catch {}
}

export function clearDraft(channelId) {
  if (!channelId) return;
  try {
    localStorage.removeItem(key(channelId));
  } catch {}
}