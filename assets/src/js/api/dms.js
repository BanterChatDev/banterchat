import { request } from './client';
import { r } from './routes';
import { addUser } from '../components/mention';
import { setAvatar } from '../utils/avatarStore';

export async function apiListDMs() {
  const res = await request('GET', r.dms.list());
  return (res && res.conversations) ? res.conversations : [];
}

export async function apiGetOrCreateDM(peerId) {
  return request('POST', r.dms.getOrCreate(peerId));
}

export async function apiListDMMessages(peerId, before) {
  const params = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await request('GET', `${r.dms.messages(peerId)}${params}`);
  if (res && res.mentioned_users) {
    for (const [id, val] of Object.entries(res.mentioned_users)) {
      if (typeof val === 'string') addUser({ id, username: val });
      else addUser({ id, username: val.username, avatar_id: val.avatar_id });
    }
  }
  const msgs = (res && res.messages) ? res.messages : (Array.isArray(res) ? res : []);
  for (const m of msgs) { if (m.user_id && m.avatar_id) setAvatar(m.user_id, m.avatar_id); }
  return msgs;
}

export async function apiListDMMembers(peerId) {
  return request('GET', r.dms.members(peerId));
}

export async function apiCloseDM(peerId) {
  return request('DELETE', r.dms.close(peerId));
}