import { request } from './client';
import { r } from './routes';
import { addUser } from '../components/mention';
import { setAvatar } from '../utils/avatarStore';
import { prefetchMessagesLinkMeta } from './linkmeta';

function seedMentionCache(mentionedUsers) {
  if (!mentionedUsers) return;
  for (const [id, val] of Object.entries(mentionedUsers)) {
    if (typeof val === 'string') {
      addUser({ id, username: val });
    } else {
      addUser({ id, username: val.username, avatar_id: val.avatar_id });
    }
  }
}

async function fetchMessages(channelId, params = '') {
  const res = await request('GET', `${r.channels.messages(channelId)}${params}`);
  if (res && res.mentioned_users) seedMentionCache(res.mentioned_users);
  const msgs = (res && res.messages) ? res.messages : (Array.isArray(res) ? res : []);
  for (const m of msgs) {
    if (m.user_id && m.avatar_id) setAvatar(m.user_id, m.avatar_id);
    if (m.user_id && m.username && m.type !== 'webhook') {
      addUser({ id: m.user_id, username: m.username, avatar_id: m.avatar_id || '', display_name: m.display_name || '' });
    }
  }
  prefetchMessagesLinkMeta(msgs);
  return msgs;
}

export function apiListMessages(channelId, before) {
  return fetchMessages(channelId, before ? `?before=${encodeURIComponent(before)}` : '');
}

export function apiListMessagesAfter(channelId, after) {
  return fetchMessages(channelId, `?after=${encodeURIComponent(after)}`);
}

export function apiListMessagesAround(channelId, messageId) {
  return fetchMessages(channelId, `?around=${encodeURIComponent(messageId)}`);
}