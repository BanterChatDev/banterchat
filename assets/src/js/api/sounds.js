import { uploadImage } from './client';
import { r } from './routes';
import { u } from './routes';

export function apiUploadNotificationSound(file) {
  return uploadImage(r.sounds.notification(), file, { fallbackName: 'sound', method: 'PUT' });
}

export function notificationSoundURL(id) {
  if (!id) return '/media/sounds/notification.wav';
  return u.attachment(id) + '?raw=1';
}