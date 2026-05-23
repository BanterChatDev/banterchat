import { request, uploadFormData } from './client';
import { r } from './routes';

export function apiListGuildEmojis(guildId) {
  return request('GET', r.guilds.emojis(guildId));
}

export function apiUploadGuildEmoji(guildId, name, file) {
  return uploadFormData(r.guilds.emojis(guildId), { name }, { file }, 'POST');
}

export function apiListDefaultEmojis() {
  return request('GET', r.emojis.default());
}

export function apiListCategoryIcons() {
  return request('GET', r.emojis.categoryIcons());
}

export function apiListFrequentEmojis(channelId) {
  const url = channelId ? `${r.emojis.frequent()}?channel_id=${encodeURIComponent(channelId)}` : r.emojis.frequent();
  return request('GET', url);
}

export function apiRenameGuildEmoji(guildId, emojiId, name) {
  return request('PATCH', r.guilds.emoji(guildId, emojiId), { name });
}

export function apiDeleteGuildEmoji(guildId, emojiId) {
  return request('DELETE', r.guilds.emoji(guildId, emojiId));
}