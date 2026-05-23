import { request, uploadImage } from './client';
import { r } from './routes';

export function apiCreateWebhook(channelId, { name, avatarId } = {}) {
  return request('POST', r.channelWebhooks(channelId), { name: name || '', avatar_id: avatarId || '' });
}

export function apiUploadWebhookAvatar(webhookId, file, crop) {
  return uploadImage(r.webhookAvatarUpload(webhookId), file, { fallbackName: 'webhook-avatar', crop });
}

export function apiDeleteWebhookAvatar(webhookId) {
  return request('DELETE', r.webhookAvatarUpload(webhookId));
}

export function apiListChannelWebhooks(channelId) {
  return request('GET', r.channelWebhooks(channelId));
}

export function apiListGuildWebhooks(guildId) {
  return request('GET', r.guilds.webhooks(guildId));
}

export function apiUpdateWebhook(id, { name, avatarId, disabled } = {}) {
  const body = {};
  if (name !== undefined) body.name = name;
  if (avatarId !== undefined) body.avatar_id = avatarId;
  if (disabled !== undefined) body.disabled = disabled;
  return request('PATCH', r.webhook(id), body);
}

export function apiDeleteWebhook(id) {
  return request('DELETE', r.webhook(id));
}

export function apiRegenerateWebhookToken(id) {
  return request('POST', r.webhookRegen(id));
}