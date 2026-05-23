import { request } from './client';
import { r } from './routes';

// Channel list + create + reorder are guild-scoped — URL carries guildId.
// Update / delete / permission overrides stay on /channels/:id because the
// backend resolves the guild via channel→guild lookup in middleware.

export async function apiListChannels(guildId) {
  if (!guildId) throw new Error('apiListChannels requires guildId');
  return request('GET', r.channels.list(guildId));
}

export async function apiGetChannel(channelId) {
  if (!channelId) throw new Error('apiGetChannel requires channelId');
  return request('GET', r.channels.get(channelId));
}

export async function apiCreateChannel(guildId, name, description, categoryId, type) {
  if (!guildId) throw new Error('apiCreateChannel requires guildId');
  return request('POST', r.channels.create(guildId), {
    name,
    description,
    category_id: categoryId || '',
    type: type || 'text',
  });
}

export async function apiUpdateChannel(id, data) {
  return request('PUT', r.channels.update(id), data);
}

export async function apiReorderChannels(guildId, items) {
  if (!guildId) throw new Error('apiReorderChannels requires guildId');
  return request('PUT', r.channels.reorder(guildId), { items });
}

export async function apiDeleteChannel(id) {
  return request('DELETE', r.channels.delete(id));
}

export async function apiDuplicateChannel(id) {
  return request('POST', r.channels.duplicate(id));
}

export async function apiGetChannelPerms(id) {
  return request('GET', r.channels.permissions(id));
}

export async function apiSetChannelPerm(id, roleId, allow, deny) {
  return request('PUT', r.channels.permissions(id), { role_id: roleId, allow, deny });
}

export async function apiGetVoiceStates() {
  return request('GET', r.voice.states());
}