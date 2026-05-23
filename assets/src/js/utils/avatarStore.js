import { cacheStore } from '../cache';

const AVATAR_PREFIX = 'avatar:';

export function setAvatar(userId, avatarId) {
  if (userId) cacheStore.set(AVATAR_PREFIX + userId, { data: avatarId ?? '', time: Date.now() });
}

export function getAvatar(userId) {
  const e = cacheStore.get(AVATAR_PREFIX + userId);
  return e ? e.data : '';
}

export function seedAvatars(users) {
  if (!Array.isArray(users)) return;
  for (const u of users) {
    if (u.id && u.avatar_id !== undefined) cacheStore.set(AVATAR_PREFIX + u.id, { data: u.avatar_id, time: Date.now() });
  }
}